import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { testEmail } = await request.json()

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    console.log('=== EMAIL VERIFICATION TEST ===')
    console.log('Test email:', testEmail)
    console.log('Redirect URL from env:', process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL)
    console.log('Current time:', new Date().toISOString())

    // Try to send a simple signup email
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'tempPassword123!',
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || `http://localhost:3000/auth/callback`,
        data: {
          full_name: 'Test User',
          user_type: 'farmer'
        }
      }
    })

    console.log('Supabase response:', {
      user_created: data.user ? true : false,
      user_id: data.user?.id,
      email_confirmed_at: data.user?.email_confirmed_at,
      session_exists: data.session ? true : false,
      error: error?.message
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: {
          code: error.name,
          status: error.status,
          redirect_url: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Test signup completed',
      details: {
        user_id: data.user?.id,
        needs_confirmation: !data.user?.email_confirmed_at,
        redirect_url: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Email test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
