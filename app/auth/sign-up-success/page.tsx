"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function SignUpSuccessPage() {
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")

  const handleResendEmail = async () => {
    setIsResending(true)
    setResendMessage("")
    
    const email = localStorage.getItem('pending_verification_email')
    if (!email) {
      setResendMessage("No email found to resend to. Please sign up again.")
      setIsResending(false)
      return
    }

    const supabase = createClient()
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL || `http://localhost:3002/auth/callback`,
        }
      })
      
      if (error) throw error
      setResendMessage("Verification email sent successfully!")
    } catch (error) {
      setResendMessage("Failed to resend email. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold">CF</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Contract Farming</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Check Your Email!</CardTitle>
              <CardDescription className="text-center">We've sent you a verification link</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  We've sent a verification email to your inbox. Click the link in the email to activate your account
                  and start connecting with farming partners.
                </p>
              </div>
              
              <div className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded">
                <p className="text-xs text-blue-700">
                  <strong>Didn't receive the email?</strong> Check your spam folder or try the button below to resend.
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className="w-full"
                >
                  {isResending ? "Resending..." : "Resend verification email"}
                </Button>
                
                {resendMessage && (
                  <p className={`text-xs text-center ${resendMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                    {resendMessage}
                  </p>
                )}
                
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/auth/login">Already verified? Sign in</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
