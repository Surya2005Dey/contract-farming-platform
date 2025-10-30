import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { escrow_id, verification_notes } = await request.json()

    // Get escrow details
    const { data: escrow, error: escrowError } = await supabase
      .from("escrow_accounts")
      .select(`
        *,
        contract:contracts(*)
      `)
      .eq("id", escrow_id)
      .single()

    if (escrowError || !escrow) {
      return NextResponse.json({ error: "Escrow account not found" }, { status: 404 })
    }

    // Verify user is the buyer and escrow is funded
    if (escrow.buyer_id !== user.id) {
      return NextResponse.json({ error: "Only buyer can release payment" }, { status: 403 })
    }

    if (escrow.status !== "funded") {
      return NextResponse.json({ error: "Escrow must be funded before release" }, { status: 400 })
    }

    // Create delivery verification
    const { error: verificationError } = await supabase.from("delivery_verifications").insert({
      contract_id: escrow.contract_id,
      verified_by: user.id,
      verification_type: "buyer_confirmation",
      status: "approved",
      notes: verification_notes,
    })

    if (verificationError) {
      return NextResponse.json({ error: "Failed to create verification" }, { status: 500 })
    }

    // Create release transaction for farmer
    const { data: farmerTransaction, error: farmerTransactionError } = await supabase
      .from("payment_transactions")
      .insert({
        escrow_id: escrow_id,
        transaction_type: "release",
        amount: escrow.farmer_amount,
        payment_method: "escrow_release",
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (farmerTransactionError) {
      return NextResponse.json({ error: "Failed to create farmer transaction" }, { status: 500 })
    }

    // Create commission transaction
    const { data: commissionTransaction, error: commissionTransactionError } = await supabase
      .from("payment_transactions")
      .insert({
        escrow_id: escrow_id,
        transaction_type: "commission",
        amount: escrow.platform_commission,
        payment_method: "platform_commission",
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (commissionTransactionError) {
      return NextResponse.json({ error: "Failed to create commission transaction" }, { status: 500 })
    }

    // Add commission to platform wallet
    const { error: walletError } = await supabase.from("platform_wallet").insert({
      transaction_id: commissionTransaction.id,
      amount: escrow.platform_commission,
      transaction_type: "commission",
    })

    if (walletError) {
      return NextResponse.json({ error: "Failed to update platform wallet" }, { status: 500 })
    }

    // Update escrow status to released
    const { error: updateEscrowError } = await supabase
      .from("escrow_accounts")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
      })
      .eq("id", escrow_id)

    if (updateEscrowError) {
      return NextResponse.json({ error: "Failed to update escrow status" }, { status: 500 })
    }

    // Update contract status to completed
    const { error: contractUpdateError } = await supabase
      .from("contracts")
      .update({ status: "completed" })
      .eq("id", escrow.contract_id)

    if (contractUpdateError) {
      return NextResponse.json({ error: "Failed to update contract status" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Payment released successfully to farmer",
      farmer_amount: escrow.farmer_amount,
      commission: escrow.platform_commission,
    })
  } catch (error) {
    console.error("Payment release error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
