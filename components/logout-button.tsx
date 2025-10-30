'use client'

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh() // Refresh the page to update the auth state
  }

  return (
    <Button onClick={handleSignOut} variant="outline" size="sm">
      <LogOut className="h-4 w-4 mr-2" />
      Logout
    </Button>
  )
}