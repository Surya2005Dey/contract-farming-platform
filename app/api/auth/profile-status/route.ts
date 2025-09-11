import { createClient } from '@/lib/supabase/server'
import { validateUserProfile, getProfileCompletionPercentage } from '@/lib/profile-validation'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { 
          error: 'Profile not found',
          hasProfile: false,
          isValid: false,
          completionPercentage: 0,
          validationErrors: []
        },
        { status: 404 }
      )
    }

    // Validate profile
    const validationErrors = validateUserProfile(profile)
    const isValid = validationErrors.length === 0
    const completionPercentage = getProfileCompletionPercentage(profile)

    return NextResponse.json({
      hasProfile: true,
      isValid,
      completionPercentage,
      validationErrors,
      profile,
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
      }
    })

  } catch (error) {
    console.error('Profile status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
