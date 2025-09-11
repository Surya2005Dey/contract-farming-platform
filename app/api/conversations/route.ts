import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select(`
        *,
        participant_1_profile:profiles!conversations_participant_1_fkey(full_name, user_type),
        participant_2_profile:profiles!conversations_participant_2_fkey(full_name, user_type),
        contract:contracts(crop_type, status),
        messages(content, created_at, sender_id)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order("last_message_at", { ascending: false })

    if (error) {
      console.log("[v0] Conversations fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format conversations with other participant info
    const formattedConversations = conversations?.map((conv) => {
      const otherParticipant = conv.participant_1 === user.id ? conv.participant_2_profile : conv.participant_1_profile

      const lastMessage = conv.messages?.[conv.messages.length - 1]

      return {
        ...conv,
        other_participant: otherParticipant,
        last_message: lastMessage,
        unread_count: 0, // TODO: Calculate unread messages
      }
    })

    return NextResponse.json({ conversations: formattedConversations })
  } catch (error) {
    console.log("[v0] Conversations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { participant_id, contract_id } = await request.json()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: existingConv } = await supabase
      .from("conversations")
      .select("*")
      .or(
        `and(participant_1.eq.${user.id},participant_2.eq.${participant_id}),and(participant_1.eq.${participant_id},participant_2.eq.${user.id})`,
      )
      .eq("contract_id", contract_id)
      .single()

    if (existingConv) {
      return NextResponse.json({ conversation: existingConv })
    }

    // Create new conversation
    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        participant_1: user.id,
        participant_2: participant_id,
        contract_id: contract_id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.log("[v0] Create conversation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
