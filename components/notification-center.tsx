'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/use-user'
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  CheckCircle, 
  MessageCircle, 
  AlertCircle, 
  FileText, 
  DollarSign,
  Package,
  Star
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

const NOTIFICATION_ICONS = {
  contract: FileText,
  bid: DollarSign,
  message: MessageCircle,
  payment: DollarSign,
  logistics: Package,
  rating: Star,
  system: AlertCircle,
}

const NOTIFICATION_COLORS = {
  contract: 'text-blue-500',
  bid: 'text-green-500',
  message: 'text-purple-500',
  payment: 'text-yellow-500',
  logistics: 'text-orange-500',
  rating: 'text-pink-500',
  system: 'text-red-500',
}

export function NotificationCenter() {
  const { user } = useUser()
  const { notifications, loading, markAsRead, markAllAsRead } = useRealtimeNotifications({
    user,
  })
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const filteredNotifications = showUnreadOnly 
    ? notifications.filter(n => !n.read_at)
    : notifications

  const unreadCount = notifications.filter(n => !n.read_at).length

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read_at) {
      await markAsRead([notification.id])
    }
    
    // Handle navigation based on notification type and metadata
    if (notification.metadata?.url) {
      window.location.href = notification.metadata.url
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 animate-pulse" />
            <CardTitle>Loading notifications...</CardTitle>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              >
                {showUnreadOnly ? 'Show All' : 'Unread'}
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        <CardDescription>
          {filteredNotifications.length === 0 
            ? 'No notifications'
            : `${filteredNotifications.length} notification${filteredNotifications.length === 1 ? '' : 's'}`
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredNotifications.map((notification) => {
                const IconComponent = NOTIFICATION_ICONS[notification.type as keyof typeof NOTIFICATION_ICONS] || AlertCircle
                const iconColor = NOTIFICATION_COLORS[notification.type as keyof typeof NOTIFICATION_COLORS] || 'text-gray-500'
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                      !notification.read_at && "bg-blue-50/50 border-blue-200"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <IconComponent className={cn("h-5 w-5 mt-0.5 flex-shrink-0", iconColor)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={cn(
                            "text-sm font-medium",
                            !notification.read_at && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.read_at && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}