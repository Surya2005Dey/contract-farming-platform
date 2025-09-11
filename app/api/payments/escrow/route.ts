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

    const { contract_id, payment_method } = await request.json()

    // Get contract details
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*, farmer:profiles!farmer_id(*), buyer:profiles!buyer_id(*)")
      .eq("id", contract_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    // Verify user is the buyer
    if (contract.buyer_id !== user.id) {
      return NextResponse.json({ error: "Only buyer can initiate payment" }, { status: 403 })
    }

    // Calculate commission and amounts
    const total_amount = contract.total_amount
    const commission_rate = 0.05 // 5%
    const platform_commission = total_amount * commission_rate
    const farmer_amount = total_amount - platform_commission

    // Create escrow account
    const { data: escrow, error: escrowError } = await supabase
      .from("escrow_accounts")
      .insert({
        contract_id,
        buyer_id: contract.buyer_id,
        farmer_id: contract.farmer_id,
        total_amount,
        platform_commission_rate: commission_rate,
        platform_commission,
        farmer_amount,
        status: "pending",
      })
      .select()
      .single()

    if (escrowError) {
      return NextResponse.json({ error: "Failed to create escrow account" }, { status: 500 })
    }

    // Create initial deposit transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .insert({
        escrow_id: escrow.id,
        transaction_type: "deposit",
        amount: total_amount,
        payment_method,
        status: "pending",
      })
      .select()
      .single()

    if (transactionError) {
      return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 })
    }

    return NextResponse.json({
      escrow_id: escrow.id,
      transaction_id: transaction.id,
      amount: total_amount,
      commission: platform_commission,
      farmer_amount,
    })
  } catch (error) {
    console.error("Escrow creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: escrowAccounts, error } = await supabase
      .from("escrow_accounts")
      .select(`
        *,
        contract:contracts(*),
        transactions:payment_transactions(*)
      `)
      .or(`buyer_id.eq.${user.id},farmer_id.eq.${user.id}`)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: "Failed to fetch escrow accounts" }, { status: 500 })
    }

    return NextResponse.json({ escrow_accounts: escrowAccounts })
  } catch (error) {
    console.error("Escrow fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
