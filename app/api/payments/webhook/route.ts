import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// POST /api/payments/webhook - Handle Stripe webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error) {
      console.error("Webhook signature verification failed:", error)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const supabase = await createClient()

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log("Payment succeeded:", paymentIntent.id)

        // Update payment transaction status
        const { error: updateError } = await supabase
          .from("payment_transactions")
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
          })
          .eq("payment_gateway_id", paymentIntent.id)

        if (updateError) {
          console.error("Failed to update payment transaction:", updateError)
          break
        }

        // Update escrow account status to funded
        const contractId = paymentIntent.metadata.contract_id
        const escrowId = paymentIntent.metadata.escrow_id

        if (contractId && escrowId) {
          await supabase
            .from("escrow_accounts")
            .update({
              status: 'funded',
              funded_at: new Date().toISOString(),
            })
            .eq("id", escrowId)

          // Create notifications for both parties
          const buyerId = paymentIntent.metadata.buyer_id
          const farmerId = paymentIntent.metadata.farmer_id

          if (buyerId && farmerId) {
            // Notify farmer
            await supabase
              .from("notifications")
              .insert({
                user_id: farmerId,
                type: 'payment',
                title: 'Payment Received',
                content: 'The contract has been funded! You can now proceed with delivery.',
                related_id: contractId,
              })

            // Notify buyer
            await supabase
              .from("notifications")
              .insert({
                user_id: buyerId,
                type: 'payment',
                title: 'Payment Confirmed',
                content: 'Your payment has been confirmed and is held in escrow.',
                related_id: contractId,
              })
          }
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log("Payment failed:", paymentIntent.id)

        // Update payment transaction status
        await supabase
          .from("payment_transactions")
          .update({
            status: 'failed',
            failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
            processed_at: new Date().toISOString(),
          })
          .eq("payment_gateway_id", paymentIntent.id)

        // Notify buyer of payment failure
        const buyerId = paymentIntent.metadata.buyer_id
        if (buyerId) {
          await supabase
            .from("notifications")
            .insert({
              user_id: buyerId,
              type: 'payment',
              title: 'Payment Failed',
              content: 'Your payment failed. Please try again or contact support.',
              related_id: paymentIntent.metadata.contract_id,
            })
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}