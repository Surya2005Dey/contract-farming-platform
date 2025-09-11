import { createClient } from '@/lib/supabase/server'
import { validateUserProfile } from '@/lib/profile-validation'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Step 1: Attempt Supabase authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 401 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    // Step 2: Verify user profile exists in our database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      // If profile doesn't exist, sign out the user and return error
      await supabase.auth.signOut()
      return NextResponse.json(
        { 
          error: 'User profile not found. Please contact support or sign up again.',
          code: 'PROFILE_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Step 3: Validate profile data integrity
    const validationErrors = validateUserProfile(profile)

    if (validationErrors.length > 0) {
      // Sign out the user if profile data is invalid
      await supabase.auth.signOut()
      return NextResponse.json(
        { 
          error: 'Profile validation failed',
          details: validationErrors.map(e => e.message),
          code: 'PROFILE_INVALID'
        },
        { status: 422 }
      )
    }

    // Step 4: Check if email is confirmed
    if (!authData.user.email_confirmed_at) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { 
          error: 'Please verify your email address before signing in',
          code: 'EMAIL_NOT_VERIFIED'
        },
        { status: 403 }
      )
    }

    // Step 5: Update last login timestamp
    await supabase
      .from('profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', authData.user.id)

    // Return success with user data
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        profile: profile
      },
      session: authData.session
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
