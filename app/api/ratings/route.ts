import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get user's rating summary
    const { data: summary, error: summaryError } = await supabase
      .from("user_rating_summary")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (summaryError && summaryError.code !== "PGRST116") {
      console.error("[v0] Error fetching rating summary:", summaryError)
      return NextResponse.json({ error: "Failed to fetch rating summary" }, { status: 500 })
    }

    // Get recent reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from("ratings")
      .select(`
        *,
        reviewer:reviewer_id(full_name, user_type),
        contract:contract_id(crop_type, created_at)
      `)
      .eq("reviewee_id", userId)
      .eq("category", "overall")
      .order("created_at", { ascending: false })
      .limit(10)

    if (reviewsError) {
      console.error("[v0] Error fetching reviews:", reviewsError)
      return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
    }

    return NextResponse.json({
      summary: summary || { average_rating: 0, total_reviews: 0 },
      reviews: reviews || [],
    })
  } catch (error) {
    console.error("[v0] Error in ratings GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { contractId, revieweeId, ratings, reviewText } = body

    // Verify the contract exists and is completed
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .eq("status", "completed")
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found or not completed" }, { status: 400 })
    }

    // Verify user is part of the contract
    if (contract.farmer_id !== user.id && contract.buyer_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized to review this contract" }, { status: 403 })
    }

    // Create ratings for each category
    const ratingInserts = Object.entries(ratings).map(([category, rating]) => ({
      contract_id: contractId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating: rating as number,
      review_text: category === "overall" ? reviewText : null,
      category,
    }))

    const { error: insertError } = await supabase.from("ratings").upsert(ratingInserts, {
      onConflict: "contract_id,reviewer_id,reviewee_id,category",
    })

    if (insertError) {
      console.error("[v0] Error inserting ratings:", insertError)
      return NextResponse.json({ error: "Failed to submit ratings" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in ratings POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
