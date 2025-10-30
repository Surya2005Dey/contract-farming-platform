import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'

interface Contract {
  id: string
  farmer_id: string
  buyer_id: string
  crop_type: string
  quantity: number
  price_per_unit: number
  total_amount: number
  delivery_date: string
  status: string
  created_at: string
  updated_at: string
  farmer: {
    id: string
    full_name: string
    user_type: string
    location: string
  }
  buyer: {
    id: string
    full_name: string
    user_type: string
    company_name: string
  }
}

interface UseRealtimeContractsProps {
  user: User | null
  status?: string
  userType?: 'farmer' | 'buyer'
}

export function useRealtimeContracts({ user, status, userType }: UseRealtimeContractsProps) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    // Fetch initial contracts
    const fetchContracts = async () => {
      try {
        const params = new URLSearchParams()
        if (status) params.append('status', status)
        if (userType) params.append('userType', userType)

        const response = await fetch(`/api/contracts?${params.toString()}`)
        if (response.ok) {
          const result = await response.json()
          setContracts(result.data || [])
        }
      } catch (error) {
        console.error('Error fetching contracts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchContracts()

    // Set up real-time subscription for contract changes
    const channel = supabase
      .channel(`contracts-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contracts',
          filter: `farmer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New contract (as farmer):', payload)
          // Fetch complete contract data with relationships
          fetchContracts()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contracts',
          filter: `buyer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New contract (as buyer):', payload)
          fetchContracts()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contracts',
          filter: `farmer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Contract updated (as farmer):', payload)
          fetchContracts()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contracts',
          filter: `buyer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Contract updated (as buyer):', payload)
          fetchContracts()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user, status, userType, supabase])

  const updateContractStatus = async (contractId: string, newStatus: string, notes?: string) => {
    if (!user) return false

    try {
      const response = await fetch(`/api/contracts/${contractId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes,
        }),
      })

      if (response.ok) {
        // Contract will be updated via real-time subscription
        return true
      }
      return false
    } catch (error) {
      console.error('Error updating contract status:', error)
      return false
    }
  }

  return {
    contracts,
    loading,
    updateContractStatus,
    refetch: () => {
      setLoading(true)
      // Trigger refetch by changing state
      setContracts([])
    },
  }
}