"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"

export default function EmailTestPage() {
  const [email, setEmail] = useState("")
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
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

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Email Test</h1>
            <p className="text-sm text-gray-600">Test Supabase email sending</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Test Email Verification</CardTitle>
              <CardDescription>
                This will create a test user and attempt to send a verification email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTestEmail} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Test Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="test@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? "Testing..." : "Test Email Sending"}
                </Button>
              </form>
              
              {result && (
                <div className="mt-4 p-4 border rounded-md">
                  <h3 className="font-semibold mb-2">
                    Result: {result.success ? "✅ Success" : "❌ Failed"}
                  </h3>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>1. Check Supabase Settings:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Email confirmations enabled</li>
                <li>Site URL configured correctly</li>
                <li>Redirect URLs added</li>
              </ul>
              
              <p><strong>2. SMTP Configuration:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Custom SMTP configured (recommended)</li>
                <li>Rate limits not exceeded</li>
                <li>Sender email verified</li>
              </ul>
              
              <p><strong>3. Check Email Delivery:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Inbox and spam folder</li>
                <li>Email provider blocking</li>
                <li>Domain reputation issues</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
