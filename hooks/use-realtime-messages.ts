import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: string
  created_at: string
  sender: {
    id: string
    full_name: string
    user_type: string
  }
}

interface UseRealtimeMessagesProps {
  conversationId: string
  user: User | null
}

export function useRealtimeMessages({ conversationId, user }: UseRealtimeMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!conversationId || !user) return

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/messages?conversation_id=${conversationId}`)
        if (response.ok) {
          const result = await response.json()
          setMessages(result.data || [])
        }
      } catch (error) {
        console.error('Error fetching messages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Set up real-time subscription
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('New message received:', payload)
          const newMessage = payload.new as Message
          
          // Fetch sender details
          supabase
            .from('profiles')
            .select('id, full_name, user_type')
            .eq('id', newMessage.sender_id)
            .single()
            .then(({ data: sender }) => {
              if (sender) {
                setMessages(prev => [...prev, { ...newMessage, sender }])
              }
            })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId, user, supabase])

  const sendMessage = async (content: string, messageType: string = 'text') => {
    if (!user || !conversationId) return

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          content,
          message_type: messageType,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Message will be added via real-time subscription
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  return {
    messages,
    loading,
    sendMessage,
  }
}