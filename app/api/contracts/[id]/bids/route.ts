import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/contracts/[id]/bids - Get all bids for a contract
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    // Check if user has access to this contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("farmer_id, buyer_id")
      .eq("id", id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    if (contract.farmer_id !== user.id && contract.buyer_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Fetch bids with bidder information
    const { data, error } = await supabase
      .from("contract_bids")
      .select(`
        *,
        bidder:bidder_id(id, full_name, user_type, company_name, location)
      `)
      .eq("contract_id", id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Contract bids fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Contract bids fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/contracts/[id]/bids - Create a new bid
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { bid_amount, message } = body

    if (!bid_amount || bid_amount <= 0) {
      return NextResponse.json(
        { error: "Valid bid_amount is required" }, 
        { status: 400 }
      )
    }

    // Check if contract exists and is open for bidding
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    // Check if contract is still open for bidding
    if (contract.status !== 'pending') {
      return NextResponse.json({ error: "Contract is not open for bidding" }, { status: 400 })
    }

    // Prevent bidding on own contract
    if (contract.farmer_id === user.id) {
      return NextResponse.json({ error: "Cannot bid on your own contract" }, { status: 400 })
    }

    // Check if user already has a pending bid
    const { data: existingBid } = await supabase
      .from("contract_bids")
      .select("id")
      .eq("contract_id", id)
      .eq("bidder_id", user.id)
      .eq("status", "pending")
      .single()

    if (existingBid) {
      return NextResponse.json({ error: "You already have a pending bid on this contract" }, { status: 400 })
    }

    // Create the bid
    const bidData = {
      contract_id: id,
      bidder_id: user.id,
      bid_amount: parseFloat(bid_amount),
      message: message || null,
      status: 'pending',
    }

    const { data, error } = await supabase
      .from("contract_bids")
      .insert(bidData)
      .select(`
        *,
        bidder:bidder_id(id, full_name, user_type, company_name, location)
      `)
      .single()

    if (error) {
      console.error("Bid creation error:", error)
      return NextResponse.json({ error: "Failed to create bid" }, { status: 500 })
    }

    // Create notification for contract owner (farmer)
    await supabase
      .from("notifications")
      .insert({
        user_id: contract.farmer_id,
        type: 'contract',
        title: 'New Bid Received',
        content: `You received a new bid of $${bid_amount} for your ${contract.crop_type} contract`,
        related_id: contract.id,
      })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Bid creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}