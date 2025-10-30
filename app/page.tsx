import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Allow viewing home page even when logged in
  // Users can manually navigate to dashboard if they want

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CF</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Contract Farming</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              // Show dashboard link and logout if user is logged in
              <>
                <Button asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
                <LogoutButton />
              </>
            ) : (
              // Show login/signup if user is not logged in
              <>
                <Button variant="ghost" asChild>
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/sign-up">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Secure Your Farm's Future with
            <span className="text-green-600"> Assured Contracts</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Connect farmers with reliable buyers through transparent contracts, guaranteed payments, and stable market
            access. Build lasting partnerships that benefit everyone in the agricultural value chain.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              // If logged in, show dashboard and profile links
              <>
                <Button size="lg" asChild className="bg-green-600 hover:bg-green-700">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/dashboard">View My Contracts</Link>
                </Button>
              </>
            ) : (
              // If not logged in, show signup and learn more
              <>
                <Button size="lg" asChild className="bg-green-600 hover:bg-green-700">
                  <Link href="/auth/sign-up">Start Farming Contracts</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#features">Learn More</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose Contract Farming?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Guaranteed Market Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Secure buyers for your crops before planting. No more uncertainty about where to sell your harvest.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Transparent Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Fair, pre-negotiated prices that protect both farmers and buyers from market volatility.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-purple-600">Secure Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Escrow-based payment system ensures timely and secure transactions for all parties involved.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-green-600 text-white">
        <div className="container mx-auto text-center max-w-3xl">
          {user ? (
            <>
              <h3 className="text-3xl font-bold mb-4">Welcome Back!</h3>
              <p className="text-xl mb-8 text-green-100">
                Ready to manage your contracts and explore new opportunities?
              </p>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-3xl font-bold mb-4">Ready to Transform Your Agricultural Business?</h3>
              <p className="text-xl mb-8 text-green-100">
                Join thousands of farmers and buyers who have already secured their future through contract farming.
              </p>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/auth/sign-up">Get Started Today</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 Contract Farming Platform. Empowering agricultural partnerships.</p>
        </div>
      </footer>
    </div>
  )
}
