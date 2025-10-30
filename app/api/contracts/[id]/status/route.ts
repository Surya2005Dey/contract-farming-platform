import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// PUT /api/contracts/[id]/status - Update contract status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params
    const body = await request.json()
    const { status, notes } = body

    // Validate status
    const validStatuses = ['pending', 'active', 'completed', 'cancelled']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Valid status is required (pending, active, completed, cancelled)" }, 
        { status: 400 }
      )
    }

    // First check if contract exists and user has permission
    const { data: existingContract, error: fetchError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !existingContract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    // Check if user is involved in this contract
    if (existingContract.farmer_id !== user.id && existingContract.buyer_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Validate status transitions
    const currentStatus = existingContract.status as string
    const validTransitions: Record<string, string[]> = {
      'pending': ['active', 'cancelled'],
      'active': ['completed', 'cancelled'],
      'completed': [], // Can't change from completed
      'cancelled': [], // Can't change from cancelled
    }

    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot change status from ${currentStatus} to ${status}` }, 
        { status: 400 }
      )
    }

    // Update contract status
    const { data, error } = await supabase
      .from("contracts")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select(`
        *,
        farmer:farmer_id(id, full_name, user_type, location),
        buyer:buyer_id(id, full_name, user_type, company_name)
      `)
      .single()

    if (error) {
      console.error("Contract status update error:", error)
      return NextResponse.json({ error: "Failed to update contract status" }, { status: 500 })
    }

    // Create notifications for status changes
    const otherPartyId = user.id === data.farmer_id ? data.buyer_id : data.farmer_id
    
    let notificationContent = ""
    switch (status) {
      case 'active':
        notificationContent = `Contract for ${data.crop_type} has been activated`
        break
      case 'completed':
        notificationContent = `Contract for ${data.crop_type} has been completed`
        break
      case 'cancelled':
        notificationContent = `Contract for ${data.crop_type} has been cancelled`
        break
    }

    if (notificationContent) {
      await supabase
        .from("notifications")
        .insert({
          user_id: otherPartyId,
          type: 'contract',
          title: 'Contract Status Update',
          content: notificationContent,
          related_id: data.id,
        })
    }

    // If contract is activated, create escrow account
    if (status === 'active') {
      const platformCommissionRate = 0.05 // 5%
      const platformCommission = data.total_amount * platformCommissionRate
      const farmerAmount = data.total_amount - platformCommission

      await supabase
        .from("escrow_accounts")
        .insert({
          contract_id: data.id,
          buyer_id: data.buyer_id,
          farmer_id: data.farmer_id,
          total_amount: data.total_amount,
          platform_commission_rate: platformCommissionRate,
          platform_commission: platformCommission,
          farmer_amount: farmerAmount,
          status: 'pending',
        })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Contract status update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}