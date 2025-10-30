# Real-time Features Setup Guide

## Overview
This guide covers the complete setup of real-time features for the Contract Farming Platform, including live chat, real-time notifications, and contract updates.

## Environment Variables Required

### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Stripe Configuration (for payment features)
```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## Real-time Features Implemented

### 1. Live Messaging System
- **Component**: `LiveChat` (`/components/live-chat.tsx`)
- **Hook**: `useRealtimeMessages` (`/hooks/use-realtime-messages.ts`)
- **API**: `/api/messages`
- **Features**:
  - Real-time message delivery
  - Message history loading
  - Typing indicators ready
  - Message status tracking
  - Auto-scroll to latest messages

### 2. Real-time Notifications
- **Component**: `NotificationCenter` (`/components/notification-center.tsx`)
- **Hook**: `useRealtimeNotifications` (`/hooks/use-realtime-notifications.ts`)
- **API**: `/api/notifications`
- **Features**:
  - Browser push notifications
  - Real-time notification updates
  - Mark as read functionality
  - Notification categories (contract, message, payment, etc.)
  - Unread count tracking

### 3. Real-time Contract Updates
- **Component**: `ContractManager` (`/components/contract-manager.tsx`)
- **Hook**: `useRealtimeContracts` (`/hooks/use-realtime-contracts.ts`)
- **API**: `/api/contracts`
- **Features**:
  - Live contract status updates
  - Real-time bidding updates
  - Contract filtering and search
  - Status change notifications

### 4. Integrated Dashboard
- **Component**: `RealtimeDashboard` (`/components/realtime-dashboard.tsx`)
- **Features**:
  - Live statistics updates
  - Recent activity feeds
  - Notification integration
  - Contract overview with real-time updates

## Database Tables Used

### Messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_id UUID,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id UUID REFERENCES profiles(id),
  participant2_id UUID REFERENCES profiles(id),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Real-time Subscriptions Setup

### Supabase Real-time Configuration
1. Enable real-time on required tables:
   - `messages`
   - `notifications` 
   - `contracts`
   - `conversations`

2. Set up Row Level Security (RLS) policies for secure access

### Browser Notification Permissions
The platform automatically requests browser notification permissions when users interact with the notification system.

## Usage Examples

### Using Live Chat
```tsx
import { LiveChat } from '@/components/live-chat'

<LiveChat 
  conversationId="conversation-uuid"
  otherParticipant={{
    id: "user-id",
    full_name: "John Doe",
    user_type: "farmer"
  }}
/>
```

### Using Real-time Notifications
```tsx
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'

const { notifications, unreadCount, markAsRead } = useRealtimeNotifications({ user })
```

### Using Real-time Contracts
```tsx
import { useRealtimeContracts } from '@/hooks/use-realtime-contracts'

const { contracts, loading } = useRealtimeContracts({ user })
```

## Testing Real-time Features

### 1. Test Live Messaging
1. Create two user accounts
2. Navigate to chat page: `/chat/[conversationId]`
3. Send messages from both accounts
4. Verify real-time message delivery

### 2. Test Notifications
1. Trigger contract or bid events
2. Check notification center for real-time updates
3. Verify browser notifications (if permission granted)

### 3. Test Contract Updates
1. Create/update contracts from different accounts
2. Verify dashboard shows live updates
3. Check status changes reflect immediately

## Performance Considerations

### Real-time Connection Management
- Connections are automatically managed per component
- Subscriptions are cleaned up on component unmount
- Multiple subscriptions are consolidated where possible

### Data Optimization
- Real-time hooks include loading states
- Data is paginated and limited appropriately
- Optimistic updates for better UX

## Troubleshooting

### Common Issues
1. **Real-time not working**: Check Supabase real-time is enabled for tables
2. **Notifications not showing**: Verify browser notification permissions
3. **Chat messages not sending**: Check API endpoint and authentication
4. **Performance issues**: Review subscription filters and data limits

### Debug Tips
- Check browser console for real-time connection logs
- Verify environment variables are set correctly
- Test API endpoints independently
- Monitor Supabase dashboard for real-time events

## Next Steps

### Planned Enhancements
1. **Typing Indicators**: Show when users are typing
2. **Message Threading**: Reply to specific messages
3. **File Attachments**: Share documents and images
4. **Voice Messages**: Audio message support
5. **Mobile Push**: Native mobile push notifications
6. **Advanced Filtering**: More sophisticated notification filtering

### Production Deployment
1. Set up Stripe webhooks for live environment
2. Configure production Supabase project
3. Set up monitoring for real-time connections
4. Implement rate limiting for API endpoints
5. Add comprehensive error handling and logging