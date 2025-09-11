import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log("Test auth user:", user?.id)

    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: "Not authenticated",
        authError: authError?.message 
      })
    }

    // Test profile read
    const { data: profile, error: readError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    console.log("Profile read result:", { profile, readError })

    // Test profile update with minimal data
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single()

    console.log("Profile update result:", { updatedProfile, updateError })

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      profile,
      readError: readError?.message,
      updatedProfile,
      updateError: updateError?.message,
      canRead: !!profile,
      canUpdate: !!updatedProfile
    })

  } catch (error) {
    console.error("Profile test error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
