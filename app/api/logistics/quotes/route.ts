import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const contractId = searchParams.get("contract_id")

    if (!contractId) {
      return NextResponse.json({ error: "Contract ID is required" }, { status: 400 })
    }

    const { data: quotes, error } = await supabase
      .from("shipping_quotes")
      .select(`
        *,
        logistics_providers (
          name,
          type,
          rating,
          capabilities
        )
      `)
      .eq("contract_id", contractId)
      .order("estimated_cost", { ascending: true })

    if (error) {
      console.log("[v0] Error fetching quotes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ quotes })
  } catch (error) {
    console.log("[v0] Error in quotes GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()
    const { contract_id, origin_address, destination_address, weight, service_type } = body

    // Get available providers for the service type
    const { data: providers, error: providersError } = await supabase
      .from("logistics_providers")
      .select("*")
      .eq("type", "shipping")
      .eq("is_active", true)
      .contains("capabilities", [service_type])

    if (providersError) {
      return NextResponse.json({ error: providersError.message }, { status: 500 })
    }

    // Generate quotes from multiple providers
    const quotes = providers.map((provider) => {
      const baseRate = provider.base_rate
      const distance = Math.random() * 1000 + 100 // Simulated distance in km
      const serviceMultiplier = service_type === "express" ? 1.5 : service_type === "refrigerated" ? 1.3 : 1
      const estimatedCost = Math.round(baseRate * weight * distance * serviceMultiplier * 100) / 100
      const deliveryDays =
        service_type === "express" ? Math.ceil(Math.random() * 3 + 1) : Math.ceil(Math.random() * 7 + 3)

      return {
        contract_id,
        provider_id: provider.id,
        origin_address,
        destination_address,
        weight,
        service_type,
        estimated_cost: estimatedCost,
        estimated_delivery_days: deliveryDays,
        quote_valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      }
    })

    const { data: createdQuotes, error } = await supabase
      .from("shipping_quotes")
      .insert(quotes)
      .select(`
        *,
        logistics_providers (
          name,
          type,
          rating,
          capabilities
        )
      `)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ quotes: createdQuotes })
  } catch (error) {
    console.log("[v0] Error in quotes POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
