import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

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

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("Profile fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("Authentication error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    const { user_type, full_name } = body
    
    if (!user_type || !full_name) {
      return NextResponse.json(
        { error: "user_type and full_name are required" }, 
        { status: 400 }
      )
    }

    // Validate user_type
    if (!['farmer', 'buyer'].includes(user_type)) {
      return NextResponse.json(
        { error: "user_type must be 'farmer' or 'buyer'" }, 
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {
      user_type,
      full_name,
      updated_at: new Date().toISOString(),
    }

    // Add optional fields if provided
    if (body.phone) updateData.phone = body.phone
    if (body.location) updateData.location = body.location
    if (body.company_name) updateData.company_name = body.company_name
    if (body.farm_size !== undefined) updateData.farm_size = body.farm_size
    if (body.specialization) updateData.specialization = body.specialization

    console.log("Updating profile for user:", user.id, "with data:", updateData)

    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Profile update error:", error)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
    const { user_type, full_name } = body
    
    if (!user_type || !full_name) {
      return NextResponse.json(
        { error: "user_type and full_name are required" }, 
        { status: 400 }
      )
    }

    // Validate user_type
    if (!['farmer', 'buyer'].includes(user_type)) {
      return NextResponse.json(
        { error: "user_type must be 'farmer' or 'buyer'" }, 
        { status: 400 }
      )
    }

    // Prepare profile data
    const profileData: any = {
      id: user.id,
      user_type,
      full_name,
    }

    // Add optional fields if provided
    if (body.phone) profileData.phone = body.phone
    if (body.location) profileData.location = body.location
    if (body.company_name) profileData.company_name = body.company_name
    if (body.farm_size !== undefined) profileData.farm_size = body.farm_size
    if (body.specialization) profileData.specialization = body.specialization

    const { data, error } = await supabase
      .from("profiles")
      .insert(profileData)
      .select()
      .single()

    if (error) {
      console.error("Profile creation error:", error)
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Profile creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
