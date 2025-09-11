import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const serviceType = searchParams.get("service_type")

    let query = supabase
      .from("logistics_providers")
      .select("*")
      .eq("is_active", true)
      .order("rating", { ascending: false })

    if (type) {
      query = query.eq("type", type)
    }

    if (serviceType) {
      query = query.contains("capabilities", [serviceType])
    }

    const { data: providers, error } = await query

    if (error) {
      console.log("[v0] Error fetching providers:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ providers })
  } catch (error) {
    console.log("[v0] Error in providers GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
