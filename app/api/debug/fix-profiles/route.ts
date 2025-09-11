import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return handleFixProfiles()
}

export async function POST(request: NextRequest) {
  return handleFixProfiles()
}

async function handleFixProfiles() {
  const supabase = await createClient()

  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      return NextResponse.json({
        success: false,
        error: `Failed to get auth users: ${authError.message}`
      }, { status: 500 })
    }

    let fixedCount = 0
    let errorCount = 0
    const results = []

    for (const user of authUsers.users) {
      try {
        const metadata = user.user_metadata || {}
        
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        const profileData = {
          id: user.id,
          user_type: metadata.user_type || 'farmer',
          full_name: metadata.full_name || user.email || 'User',
          phone: metadata.phone || null,
        }

        if (existingProfile) {
          // Update existing profile
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              user_type: profileData.user_type,
              full_name: profileData.full_name,
              phone: profileData.phone,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

          if (updateError) {
            errorCount++
            results.push({ 
              userId: user.id, 
              email: user.email,
              action: 'update',
              success: false, 
              error: updateError.message 
            })
          } else {
            fixedCount++
            results.push({ 
              userId: user.id, 
              email: user.email,
              action: 'update',
              success: true, 
              data: profileData 
            })
          }
        } else {
          // Create new profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert(profileData)

          if (insertError) {
            errorCount++
            results.push({ 
              userId: user.id, 
              email: user.email,
              action: 'create',
              success: false, 
              error: insertError.message 
            })
          } else {
            fixedCount++
            results.push({ 
              userId: user.id, 
              email: user.email,
              action: 'create',
              success: true, 
              data: profileData 
            })
          }
        }
      } catch (userError) {
        errorCount++
        results.push({ 
          userId: user.id, 
          email: user.email,
          action: 'process',
          success: false, 
          error: userError instanceof Error ? userError.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${authUsers.users.length} users. Fixed: ${fixedCount}, Errors: ${errorCount}`,
      fixedCount,
      errorCount,
      totalUsers: authUsers.users.length,
      results
    })

  } catch (error) {
    console.error('Fix profiles error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
