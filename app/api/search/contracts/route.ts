import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const cropType = searchParams.get("crop_type")
  const location = searchParams.get("location")
  const minQuantity = searchParams.get("min_quantity")
  const maxQuantity = searchParams.get("max_quantity")
  const minPrice = searchParams.get("min_price")
  const maxPrice = searchParams.get("max_price")
  const deliveryFrom = searchParams.get("delivery_from")
  const deliveryTo = searchParams.get("delivery_to")
  const status = searchParams.get("status") || "pending"
  const userType = searchParams.get("user_type") // 'farmer' or 'buyer'

  try {
    let query = supabase
      .from("contracts")
      .select(`
        *,
        farmer:profiles!farmer_id(full_name, location, specialization),
        buyer:profiles!buyer_id(full_name, location, company_name)
      `)
      .eq("status", status)

    if (cropType) {
      query = query.ilike("crop_type", `%${cropType}%`)
    }

    if (location) {
      query = query.or(`farmer.location.ilike.%${location}%,buyer.location.ilike.%${location}%`)
    }

    if (minQuantity) {
      query = query.gte("quantity", Number.parseFloat(minQuantity))
    }

    if (maxQuantity) {
      query = query.lte("quantity", Number.parseFloat(maxQuantity))
    }

    if (minPrice) {
      query = query.gte("price_per_unit", Number.parseFloat(minPrice))
    }

    if (maxPrice) {
      query = query.lte("price_per_unit", Number.parseFloat(maxPrice))
    }

    if (deliveryFrom) {
      query = query.gte("delivery_date", deliveryFrom)
    }

    if (deliveryTo) {
      query = query.lte("delivery_date", deliveryTo)
    }

    const { data: contracts, error } = await query.order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contracts })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

