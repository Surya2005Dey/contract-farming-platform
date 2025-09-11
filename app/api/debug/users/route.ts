import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  try {
    // Get all users with their profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    // Get auth users metadata
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    return NextResponse.json({
      success: true,
      profiles: profiles || [],
      authUsers: authUsers.users || [],
      errors: {
        profileError: profileError?.message,
        authError: authError?.message
      }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
