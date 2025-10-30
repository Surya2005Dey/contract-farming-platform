'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@/hooks/use-user'
import { useRealtimeMessages } from '@/hooks/use-realtime-messages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface LiveChatProps {
  conversationId: string
  otherParticipant: {
    id: string
    full_name: string
    user_type: string
    company_name?: string
  }
}

export function LiveChat({ conversationId, otherParticipant }: LiveChatProps) {
  const { user } = useUser()
  const { messages, loading, sendMessage } = useRealtimeMessages({
    conversationId,
    user,
  })
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    const success = await sendMessage(newMessage.trim())
    if (success) {
      setNewMessage('')
    }
    setSending(false)
  }

  if (loading) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-6 w-6 animate-pulse" />
          <span>Loading chat...</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback>
              {otherParticipant.full_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">{otherParticipant.full_name}</div>
            <div className="text-sm text-muted-foreground">
              {otherParticipant.user_type === 'buyer' 
                ? otherParticipant.company_name || 'Buyer'
                : 'Farmer'}
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}