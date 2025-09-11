import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    console.log('Testing email sending to:', email)
    console.log('Redirect URL:', process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL)

    // Test signup with a simple email
    const { data, error } = await supabase.auth.signUp({
      email,
      password: 'temppassword123',
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || `http://localhost:3002/auth/callback`,
        data: {
          full_name: 'Test User',
          user_type: 'farmer',
        },
      },
    })

    if (error) {
      console.error('Supabase signup error:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: error
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test signup created successfully',
      user: data.user,
      needsConfirmation: !data.user?.email_confirmed_at,
      session: data.session
    })

  } catch (error) {
    console.error('Email test error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}
