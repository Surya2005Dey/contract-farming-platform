import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Test Supabase connection
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
        NEXT_PUBLIC_SUPABASE_REDIRECT_URL: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || 'Not set',
        NODE_ENV: process.env.NODE_ENV,
      },
      supabase: {
        connection: userError ? 'Failed' : 'Success',
        userStatus: user ? 'Authenticated' : 'Not authenticated',
        error: userError?.message
      },
      recommendations: [] as string[]
    }

    // Add recommendations based on findings
    if (!process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL) {
      diagnostics.recommendations.push('Set NEXT_PUBLIC_SUPABASE_REDIRECT_URL in .env.local')
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL && !process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL.includes('localhost:3002')) {
      diagnostics.recommendations.push('Update NEXT_PUBLIC_SUPABASE_REDIRECT_URL to match current port (3002)')
    }

    return NextResponse.json(diagnostics)

  } catch (error) {
    return NextResponse.json({
      error: 'Diagnostics failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, email } = await request.json()
    const supabase = await createClient()

    if (action === 'resend' && email) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || `http://localhost:3002/auth/callback`,
        }
      })

      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message,
          code: error.name
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'Resend email sent successfully'
      })
    }

    return NextResponse.json({
      error: 'Invalid action or missing parameters'
    }, { status: 400 })

  } catch (error) {
    return NextResponse.json({
      error: 'Request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
