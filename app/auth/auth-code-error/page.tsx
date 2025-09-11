"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-red-50 to-orange-50">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold">⚠</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Authentication Error</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-red-600">Email Confirmation Failed</CardTitle>
              <CardDescription>
                There was an issue confirming your email address. This could happen if:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                <li>The confirmation link has expired</li>
                <li>The link has already been used</li>
                <li>There was a network error</li>
              </ul>
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/auth/sign-up">Try signing up again</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/auth/login">Already have an account? Sign in</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
