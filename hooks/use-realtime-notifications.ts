import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  content: string
  related_id: string | null
  read_at: string | null
  created_at: string
}

interface UseRealtimeNotificationsProps {
  user: User | null
}

export function useRealtimeNotifications({ user }: UseRealtimeNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const result = await response.json()
          const notificationData = result.data || []
          setNotifications(notificationData)
          setUnreadCount(notificationData.filter((n: Notification) => !n.read_at).length)
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification received:', payload)
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)

          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.content,
              icon: '/favicon.ico',
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Notification updated:', payload)
          const updatedNotification = payload.new as Notification
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          )
          
          // Update unread count
          if (updatedNotification.read_at) {
            setUnreadCount(prev => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user, supabase])

  const markAsRead = async (notificationIds?: string[]) => {
    if (!user) return

    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_ids: notificationIds,
          mark_all: !notificationIds,
        }),
      })

      if (response.ok) {
        if (notificationIds) {
          setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
        } else {
          setUnreadCount(0)
        }
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const markAllAsRead = async () => {
    await markAsRead()
  }

  const requestNotificationPermission = async () => {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    requestNotificationPermission,
  }
}