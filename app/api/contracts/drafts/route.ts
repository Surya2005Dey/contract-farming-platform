import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: drafts, error } = await supabase
      .from("contract_drafts")
      .select(`
        *,
        farmer:farmer_id(full_name, user_type),
        buyer:buyer_id(full_name, user_type),
        template:template_id(name, template_fields)
      `)
      .or(`farmer_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ drafts })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { template_id, buyer_id, contract_data } = body

    const { data: draft, error } = await supabase
      .from("contract_drafts")
      .insert({
        template_id,
        farmer_id: user.id,
        buyer_id,
        contract_data,
        status: "draft",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ draft })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
