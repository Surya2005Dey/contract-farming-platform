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
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: ratingSummary } = await supabase.from("user_rating_summary").select("*").eq("user_id", user.id).single()

  const { data: contractsNeedingReview } = await supabase
    .from("contracts")
    .select(`
      *,
      farmer:farmer_id(id, full_name),
      buyer:buyer_id(id, full_name)
    `)
    .eq("status", "completed")
    .or(`farmer_id.eq.${user.id},buyer_id.eq.${user.id}`)

  const { data: unreadNotifications } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", user.id)
    .is("read_at", null)

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
