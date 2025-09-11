"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useState, useEffect } from "react"

export default function EmailDebugPage() {
  const [testEmail, setTestEmail] = useState("")
  const [result, setResult] = useState<any>(null)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load diagnostics on component mount
  useEffect(() => {
    loadDiagnostics()
  }, [])

  const loadDiagnostics = async () => {
    try {
      const response = await fetch('/api/diagnostics/email')
      if (response.ok) {
        const data = await response.json()
        setDiagnostics(data)
      }
    } catch (error) {
      console.error('Failed to load diagnostics:', error)
    }
  }

  const testDirectEmail = async () => {
    if (!testEmail) {
      alert('Please enter an email address')
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test/email-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail }),
      })

      const data = await response.json()
      setResult({
        success: response.ok,
        status: response.status,
        data
      })

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testSignupFlow = async () => {
    if (!testEmail) {
      alert('Please enter an email address')
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'testPassword123!',
          fullName: 'Test User',
          userType: 'farmer',
          phone: '+1234567890'
        }),
      })

      const data = await response.json()
      setResult({
        success: response.ok,
        status: response.status,
        data,
        type: 'signup'
      })

    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'signup'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Verification Debug</h1>
          <p className="text-gray-600">Test and diagnose email sending issues</p>
        </div>

        {/* Diagnostics Card */}
        <Card>
          <CardHeader>
            <CardTitle>System Diagnostics</CardTitle>
            <CardDescription>Current environment and configuration status</CardDescription>
          </CardHeader>
          <CardContent>
            {diagnostics ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Supabase URL:</strong> {diagnostics.environment?.NEXT_PUBLIC_SUPABASE_URL}</div>
                  <div><strong>Anon Key:</strong> {diagnostics.environment?.NEXT_PUBLIC_SUPABASE_ANON_KEY}</div>
                  <div><strong>Redirect URL:</strong> {diagnostics.environment?.NEXT_PUBLIC_SUPABASE_REDIRECT_URL}</div>
                  <div><strong>Connection:</strong> <span className={diagnostics.supabase?.connection === 'Success' ? 'text-green-600' : 'text-red-600'}>{diagnostics.supabase?.connection}</span></div>
                </div>
                {diagnostics.recommendations?.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      <strong>Recommendations:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {diagnostics.recommendations.map((rec: string, idx: number) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <p>Loading diagnostics...</p>
            )}
          </CardContent>
        </Card>

        {/* Email Test Card */}
        <Card>
          <CardHeader>
            <CardTitle>Email Testing</CardTitle>
            <CardDescription>Test email verification with your actual email address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="testEmail">Your Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="your-email@gmail.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Use a real email address that you can check (including spam folder)
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={testDirectEmail}
                disabled={isLoading || !testEmail}
                className="flex-1"
              >
                {isLoading ? "Testing..." : "Test Direct Email"}
              </Button>
              <Button 
                onClick={testSignupFlow}
                disabled={isLoading || !testEmail}
                variant="outline"
                className="flex-1"
              >
                {isLoading ? "Testing..." : "Test Full Signup"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Card */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className={result.success ? "✅ Test Results" : "❌ Test Results"}>
                Status: {result.success ? "Success" : "Failed"} ({result.status})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
              
              {result.success && (
                <Alert className="mt-4">
                  <AlertDescription>
                    <strong>✅ Email should be sent!</strong> Check your inbox and spam folder for the verification email.
                    {result.data?.details?.needs_confirmation && (
                      <p className="mt-1">User created successfully and needs email confirmation.</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              {!result.success && (
                <Alert className="mt-4">
                  <AlertDescription>
                    <strong>❌ Email sending failed!</strong> Check the error details above and verify your Supabase configuration.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Troubleshooting Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Common Issues & Solutions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold">1. No Email Received</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Check spam/junk folder thoroughly</li>
                <li>Wait 5-10 minutes (emails can be delayed)</li>
                <li>Verify email confirmations are enabled in Supabase dashboard</li>
                <li>Check if custom SMTP is configured properly</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold">2. "Rate limit exceeded" Error</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Supabase has rate limits on default SMTP</li>
                <li>Configure custom SMTP in Supabase dashboard</li>
                <li>Wait a few minutes before trying again</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold">3. "Invalid redirect URL" Error</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Add redirect URL to Supabase dashboard: Authentication → URL Configuration</li>
                <li>Add: http://localhost:3000/auth/callback</li>
                <li>Ensure site URL is set to: http://localhost:3000</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
