import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// PUT /api/contracts/[id]/bids/[bidId] - Accept or reject a bid
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; bidId: string } }
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

    const { id: contractId, bidId } = params
    const body = await request.json()
    const { action } = body // 'accept' or 'reject'

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: "Valid action is required (accept or reject)" }, 
        { status: 400 }
      )
    }

    // Check if contract exists and user is the farmer (owner)
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    if (contract.farmer_id !== user.id) {
      return NextResponse.json({ error: "Only the contract owner can manage bids" }, { status: 403 })
    }

    // Check if bid exists and is pending
    const { data: bid, error: bidError } = await supabase
      .from("contract_bids")
      .select(`
        *,
        bidder:bidder_id(id, full_name, user_type, company_name)
      `)
      .eq("id", bidId)
      .eq("contract_id", contractId)
      .single()

    if (bidError || !bid) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 })
    }

    if (bid.status !== 'pending') {
      return NextResponse.json({ error: "Bid is no longer pending" }, { status: 400 })
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected'

    // Update bid status
    const { data: updatedBid, error } = await supabase
      .from("contract_bids")
      .update({ status: newStatus })
      .eq("id", bidId)
      .select(`
        *,
        bidder:bidder_id(id, full_name, user_type, company_name)
      `)
      .single()

    if (error) {
      console.error("Bid update error:", error)
      return NextResponse.json({ error: "Failed to update bid" }, { status: 500 })
    }

    // If bid is accepted, update contract with new buyer and price
    if (action === 'accept') {
      await supabase
        .from("contracts")
        .update({
          buyer_id: bid.bidder_id,
          price_per_unit: bid.bid_amount / contract.quantity,
          total_amount: bid.bid_amount,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq("id", contractId)

      // Reject all other pending bids for this contract
      await supabase
        .from("contract_bids")
        .update({ status: 'rejected' })
        .eq("contract_id", contractId)
        .eq("status", "pending")
        .neq("id", bidId)

      // Create escrow account for the accepted contract
      const platformCommissionRate = 0.05 // 5%
      const platformCommission = bid.bid_amount * platformCommissionRate
      const farmerAmount = bid.bid_amount - platformCommission

      await supabase
        .from("escrow_accounts")
        .insert({
          contract_id: contractId,
          buyer_id: bid.bidder_id,
          farmer_id: contract.farmer_id,
          total_amount: bid.bid_amount,
          platform_commission_rate: platformCommissionRate,
          platform_commission: platformCommission,
          farmer_amount: farmerAmount,
          status: 'pending',
        })
    }

    // Create notification for bidder
    const notificationContent = action === 'accept' 
      ? `Your bid of $${bid.bid_amount} for ${contract.crop_type} has been accepted!`
      : `Your bid of $${bid.bid_amount} for ${contract.crop_type} has been rejected.`

    await supabase
      .from("notifications")
      .insert({
        user_id: bid.bidder_id,
        type: 'contract',
        title: `Bid ${action === 'accept' ? 'Accepted' : 'Rejected'}`,
        content: notificationContent,
        related_id: contractId,
      })

    return NextResponse.json({ data: updatedBid })
  } catch (error) {
    console.error("Bid management error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}