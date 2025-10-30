import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET /api/contracts/templates - Fetch all contract templates
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: templates, error } = await supabase
      .from("contract_templates")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Contract templates fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch contract templates" }, { status: 500 })
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Contract templates fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/contracts/templates - Create new contract template
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
    const { name, description, template_fields } = body
    
    if (!name || !template_fields) {
      return NextResponse.json(
        { error: "name and template_fields are required" }, 
        { status: 400 }
      )
    }

    // Prepare template data
    const templateData = {
      name,
      description: description || null,
      template_fields,
      created_by: user.id,
      is_default: false,
    }

    const { data, error } = await supabase
      .from("contract_templates")
      .insert(templateData)
      .select()
      .single()

    if (error) {
      console.error("Contract template creation error:", error)
      return NextResponse.json({ error: "Failed to create contract template" }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Contract template creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
