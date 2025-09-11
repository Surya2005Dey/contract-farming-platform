import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { transaction_id, payment_details } = await request.json()

    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .select(`
        *,
        escrow:escrow_accounts(*)
      `)
      .eq("id", transaction_id)
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Simulate payment processing (in real implementation, integrate with Stripe/PayPal)
    const isPaymentSuccessful = Math.random() > 0.1 // 90% success rate for demo

    if (isPaymentSuccessful) {
      // Update transaction status
      const { error: updateError } = await supabase
        .from("payment_transactions")
        .update({
          status: "completed",
          payment_gateway_id: `sim_${Date.now()}`, // Simulated gateway ID
          processed_at: new Date().toISOString(),
        })
        .eq("id", transaction_id)

      if (updateError) {
        return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 })
      }

      // Update escrow status to funded
      const { error: escrowError } = await supabase
        .from("escrow_accounts")
        .update({
          status: "funded",
          funded_at: new Date().toISOString(),
        })
        .eq("id", transaction.escrow_id)

      if (escrowError) {
        return NextResponse.json({ error: "Failed to update escrow" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Payment processed successfully. Funds are now in escrow.",
        transaction_id: transaction_id,
      })
    } else {
      // Payment failed
      const { error: updateError } = await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
          failure_reason: "Payment gateway declined",
          processed_at: new Date().toISOString(),
        })
        .eq("id", transaction_id)

      return NextResponse.json(
        {
          success: false,
          message: "Payment failed. Please try again or use a different payment method.",
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Payment processing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
