import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LiveChat } from "@/components/live-chat"

interface ChatPageProps {
  params: {
    conversationId: string
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Get conversation details and other participant
  const { data: conversation } = await supabase
    .from("conversations")
    .select(`
      *,
      profiles!conversations_participant1_id_fkey(id, full_name, user_type, company_name),
      participant2:profiles!conversations_participant2_id_fkey(id, full_name, user_type, company_name)
    `)
    .eq("id", params.conversationId)
    .single()

  if (!conversation) {
    redirect("/dashboard")
  }

  // Determine the other participant
  const otherParticipant = conversation.participant1_id === user.id 
    ? conversation.participant2 
    : conversation.profiles

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Chat</h1>
        <p className="text-muted-foreground">
          Conversation with {otherParticipant?.full_name}
        </p>
      </div>
      
      <LiveChat 
        conversationId={params.conversationId}
        otherParticipant={otherParticipant}
      />
    </div>
  )
}