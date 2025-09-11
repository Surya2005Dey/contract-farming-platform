import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const contractId = searchParams.get("contract_id")

    let query = supabase
      .from("shipments")
      .select(`
        *,
        shipping_quotes (
          *,
          logistics_providers (
            name,
            type,
            rating
          )
        ),
        shipment_tracking (
          location,
          status,
          description,
          timestamp
        )
      `)
      .order("created_at", { ascending: false })

    if (contractId) {
      query = query.eq("contract_id", contractId)
    }

    const { data: shipments, error } = await query

    if (error) {
      console.log("[v0] Error fetching shipments:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ shipments })
  } catch (error) {
    console.log("[v0] Error in shipments GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const { quote_id, pickup_date, special_instructions } = body

    // Get quote details
    const { data: quote, error: quoteError } = await supabase
      .from("shipping_quotes")
      .select("*")
      .eq("id", quote_id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Generate tracking number
    const trackingNumber = `TRK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // Calculate estimated delivery date
    const estimatedDeliveryDate = new Date(pickup_date)
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + quote.estimated_delivery_days)

    const { data: shipment, error } = await supabase
      .from("shipments")
      .insert({
        contract_id: quote.contract_id,
        quote_id,
        tracking_number: trackingNumber,
        pickup_date,
        estimated_delivery_date: estimatedDeliveryDate.toISOString().split("T")[0],
        special_instructions,
        current_location: quote.origin_address,
      })
      .select(`
        *,
        shipping_quotes (
          *,
          logistics_providers (
            name,
            type,
            rating
          )
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create initial tracking event
    await supabase.from("shipment_tracking").insert({
      shipment_id: shipment.id,
      location: quote.origin_address,
      status: "booked",
      description: "Shipment booked and awaiting pickup",
      timestamp: new Date().toISOString(),
    })

    // Update quote status
    await supabase.from("shipping_quotes").update({ status: "accepted" }).eq("id", quote_id)

    return NextResponse.json({ shipment })
  } catch (error) {
    console.log("[v0] Error in shipments POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
