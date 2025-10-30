import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
})

// POST /api/payments/create-intent - Create Stripe payment intent for escrow funding
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

    const body = await request.json()
    const { contract_id, amount } = body

    if (!contract_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "contract_id and valid amount are required" }, 
        { status: 400 }
      )
    }

    // Verify contract exists and user is the buyer
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select(`
        *,
        farmer:farmer_id(id, full_name),
        buyer:buyer_id(id, full_name)
      `)
      .eq("id", contract_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    if (contract.buyer_id !== user.id) {
      return NextResponse.json({ error: "Only the buyer can fund this contract" }, { status: 403 })
    }

    if (contract.status !== 'active') {
      return NextResponse.json({ error: "Contract must be active to fund" }, { status: 400 })
    }

    // Check if escrow account exists
    const { data: escrow, error: escrowError } = await supabase
      .from("escrow_accounts")
      .select("*")
      .eq("contract_id", contract_id)
      .single()

    if (escrowError || !escrow) {
      return NextResponse.json({ error: "Escrow account not found" }, { status: 404 })
    }

    if (escrow.status !== 'pending') {
      return NextResponse.json({ error: "Escrow already funded or completed" }, { status: 400 })
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        contract_id,
        escrow_id: escrow.id,
        buyer_id: user.id,
        farmer_id: contract.farmer_id,
        customer_email: user.email || '',
      },
      description: `Escrow funding for ${contract.crop_type} contract`,
    })

    // Create payment transaction record
    await supabase
      .from("payment_transactions")
      .insert({
        escrow_id: escrow.id,
        transaction_type: 'deposit',
        amount,
        payment_method: 'stripe',
        payment_gateway_id: paymentIntent.id,
        status: 'pending',
      })

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    })
  } catch (error) {
    console.error("Payment intent creation error:", error)
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 })
  }
}