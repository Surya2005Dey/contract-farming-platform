import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // Get rating summary
  const { data: ratingSummary } = await supabase
    .from("ratings")
    .select("rating")
    .eq("rated_user_id", user.id)

  // Get contracts needing review
  const { data: contractsNeedingReview } = await supabase
    .from("contracts")
    .select("*")
    .or(`farmer_id.eq.${user.id},buyer_id.eq.${user.id}`)
    .eq("status", "pending")
    .limit(5)

  // Get unread notifications
  const { data: unreadNotifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("read", false)
    .limit(10)

  return (
    <DashboardClient
      user={user}
      profile={profile}
      ratingSummary={ratingSummary}
      contractsNeedingReview={contractsNeedingReview || []}
      unreadNotifications={unreadNotifications || []}
    />
  )
}
