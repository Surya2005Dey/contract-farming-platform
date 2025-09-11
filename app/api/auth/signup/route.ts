import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, userType, phone } = await request.json()

    if (!email || !password || !fullName || !userType) {
      return NextResponse.json(
        { error: 'Email, password, full name, and user type are required' },
        { status: 400 }
      )
    }

    // Validate user type
    if (!['farmer', 'buyer'].includes(userType)) {
      return NextResponse.json(
        { error: 'User type must be either "farmer" or "buyer"' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    console.log('Starting signup process for email:', email)
    console.log('Environment NEXT_PUBLIC_SUPABASE_REDIRECT_URL:', process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL)

    // Step 1: Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || `http://localhost:3000/auth/callback`,
        data: {
          full_name: fullName,
          user_type: userType,
          phone: phone || null,
        },
      },
    })

    console.log('Supabase signup result:', { 
      user: authData.user ? 'Created' : 'Not created',
      needsConfirmation: authData.user ? !authData.user.email_confirmed_at : 'N/A',
      error: authError?.message 
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 500 }
      )
    }

    // Step 2: The trigger will automatically create the profile with all the data
    // Wait a moment for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Step 3: Verify the profile was created successfully and get the final profile data
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (fetchError || !profile) {
      console.error('Profile fetch error:', fetchError)
      // Profile creation might have failed, let's try to create it manually
      const { error: manualCreateError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          user_type: userType,
          full_name: fullName,
          phone: phone || null,
        })

      if (manualCreateError) {
        console.error('Manual profile creation failed:', manualCreateError)
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }

      // Fetch the manually created profile
      const { data: manualProfile, error: manualFetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (manualFetchError || !manualProfile) {
        console.error('Manual profile fetch failed:', manualFetchError)
        return NextResponse.json(
          { error: 'Failed to create and fetch user profile' },
          { status: 500 }
        )
      }

      // Use the manually created profile
      return NextResponse.json({
        success: true,
        user: authData.user,
        profile: manualProfile,
        needsEmailConfirmation: !authData.user.email_confirmed_at
      })
    }

    // Profile was created successfully by trigger
    return NextResponse.json({
      success: true,
      user: authData.user,
      profile: profile,
      needsEmailConfirmation: !authData.user.email_confirmed_at
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
