import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversation_id")

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(full_name, user_type)
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) {
      console.log("[v0] Messages fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.log("[v0] Messages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { conversation_id, content } = await request.json()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        sender_id: user.id,
        content,
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(full_name, user_type)
      `)
      .single()

    if (error) {
      console.log("[v0] Send message error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get conversation to find other participant
    const { data: conversation } = await supabase
      .from("conversations")
      .select("participant_1, participant_2")
      .eq("id", conversation_id)
      .single()

    if (conversation) {
      const otherParticipant =
        conversation.participant_1 === user.id ? conversation.participant_2 : conversation.participant_1

      // Create notification for other participant
      await supabase.from("notifications").insert({
        user_id: otherParticipant,
        type: "message",
        title: "New Message",
        content: `You have a new message from ${message.sender.full_name}`,
        related_id: message.id,
      })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.log("[v0] Send message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
