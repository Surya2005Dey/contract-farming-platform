import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/contracts - Fetch user's contracts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userType = searchParams.get('userType') // 'farmer' or 'buyer'

    let query = supabase
      .from("contracts")
      .select(`
        *,
        farmer:farmer_id(id, full_name, user_type, location),
        buyer:buyer_id(id, full_name, user_type, company_name)
      `)

    // Filter by user involvement
    if (userType === 'farmer') {
      query = query.eq('farmer_id', user.id)
    } else if (userType === 'buyer') {
      query = query.eq('buyer_id', user.id)
    } else {
      // Show all contracts user is involved in
      query = query.or(`farmer_id.eq.${user.id},buyer_id.eq.${user.id}`)
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error("Contracts fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Contracts fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/contracts - Create new contract
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
    
    // Validate required fields
    const { 
      buyer_id, 
      crop_type, 
      quantity, 
      price_per_unit, 
      delivery_date,
      quality_standards,
      payment_terms 
    } = body
    
    if (!buyer_id || !crop_type || !quantity || !price_per_unit || !delivery_date) {
      return NextResponse.json(
        { error: "buyer_id, crop_type, quantity, price_per_unit, and delivery_date are required" }, 
        { status: 400 }
      )
    }

    // Calculate total amount
    const total_amount = quantity * price_per_unit

    // Prepare contract data
    const contractData = {
      farmer_id: user.id,
      buyer_id,
      crop_type,
      quantity: parseFloat(quantity),
      price_per_unit: parseFloat(price_per_unit),
      total_amount,
      delivery_date,
      quality_standards: quality_standards || null,
      payment_terms: payment_terms || 'Payment on Delivery',
      status: 'pending',
    }

    const { data, error } = await supabase
      .from("contracts")
      .insert(contractData)
      .select(`
        *,
        farmer:farmer_id(id, full_name, user_type, location),
        buyer:buyer_id(id, full_name, user_type, company_name)
      `)
      .single()

    if (error) {
      console.error("Contract creation error:", error)
      return NextResponse.json({ error: "Failed to create contract" }, { status: 500 })
    }

    // Create notification for buyer
    await supabase
      .from("notifications")
      .insert({
        user_id: buyer_id,
        type: 'contract',
        title: 'New Contract Proposal',
        content: `You have received a new contract proposal for ${crop_type} (${quantity} units)`,
        related_id: data.id,
      })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Contract creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}