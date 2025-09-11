import { createClient } from "@/lib/supabase/server"
import { validateUserProfile, UserProfile } from "@/lib/profile-validation"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: "Not authenticated" 
      })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ 
        success: false, 
        error: "Profile not found" 
      })
    }

    // Test validation
    const validationErrors = validateUserProfile(profile as UserProfile)

    return NextResponse.json({
      success: true,
      profile,
      validationErrors,
      isValid: validationErrors.length === 0,
      validationMessage: validationErrors.length > 0 
        ? `Profile validation failed: ${validationErrors.map(e => e.message).join(', ')}`
        : "Profile is valid"
    })

  } catch (error) {
    console.error("Profile validation test error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
