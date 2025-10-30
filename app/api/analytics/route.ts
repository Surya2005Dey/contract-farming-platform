import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric')
    const timeframe = searchParams.get('timeframe') || '30d'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    switch (metric) {
      case 'overview':
        return handleOverviewMetrics(timeframe, startDate, endDate)
      case 'contracts':
        return handleContractMetrics(timeframe, startDate, endDate)
      case 'users':
        return handleUserMetrics(timeframe, startDate, endDate)
      case 'revenue':
        return handleRevenueMetrics(timeframe, startDate, endDate)
      case 'engagement':
        return handleEngagementMetrics(timeframe, startDate, endDate)
      case 'geography':
        return handleGeographyMetrics(timeframe, startDate, endDate)
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid metric. Supported: overview, contracts, users, revenue, engagement, geography'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

async function handleOverviewMetrics(timeframe: string, startDate?: string | null, endDate?: string | null) {
  const supabase = await createClient()
  
  const dateFilter = getDateFilter(timeframe, startDate, endDate)
  
  try {
    // Get total counts
    const { data: totalContracts } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
    
    const { data: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
    
    const { data: activeContracts } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
    
    const { data: completedContracts } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')

    // Get recent activity
    const { data: recentContracts } = await supabase
      .from('contracts')
      .select('created_at')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end)
      .order('created_at', { ascending: false })

    const { data: recentUsers } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end)
      .order('created_at', { ascending: false })

    // Calculate revenue
    const { data: revenue } = await supabase
      .from('contracts')
      .select('quantity, price_per_unit')
      .eq('status', 'completed')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end)

    const totalRevenue = revenue?.reduce((sum, contract) => 
      sum + (contract.quantity * contract.price_per_unit), 0) || 0

    // Get contract status distribution
    const { data: contractStatusData } = await supabase
      .from('contracts')
      .select('status')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end)

    const statusDistribution = contractStatusData?.reduce((acc: any, contract) => {
      acc[contract.status] = (acc[contract.status] || 0) + 1
      return acc
    }, {}) || {}

    return NextResponse.json({
      success: true,
      data: {
        totalMetrics: {
          totalContracts: totalContracts?.length || 0,
          totalUsers: totalUsers?.length || 0,
          activeContracts: activeContracts?.length || 0,
          completedContracts: completedContracts?.length || 0
        },
        recentActivity: {
          newContracts: recentContracts?.length || 0,
          newUsers: recentUsers?.length || 0,
          totalRevenue: totalRevenue
        },
        contractStatusDistribution: statusDistribution,
        timeframe: {
          start: dateFilter.start,
          end: dateFilter.end,
          period: timeframe
        }
      }
    })

  } catch (error) {
    console.error('Overview metrics error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch overview metrics'
    }, { status: 500 })
  }
}

async function handleContractMetrics(timeframe: string, startDate?: string | null, endDate?: string | null) {
  const supabase = await createClient()
  
  const dateFilter = getDateFilter(timeframe, startDate, endDate)
  
  try {
    // Contract volume over time
    const { data: contractsOverTime } = await supabase
      .from('contracts')
      .select('created_at, status, quantity, price_per_unit, crop_type')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end)
      .order('created_at', { ascending: true })

    // Group by date
    const dailyContracts = groupByDate(contractsOverTime || [], 'created_at')

    // Crop type distribution
    const cropDistribution = contractsOverTime?.reduce((acc: any, contract) => {
      acc[contract.crop_type] = (acc[contract.crop_type] || 0) + 1
      return acc
    }, {}) || {}

    // Average contract value
    const contractValues = contractsOverTime?.map(c => c.quantity * c.price_per_unit) || []
    const avgContractValue = contractValues.length > 0 
      ? contractValues.reduce((sum, val) => sum + val, 0) / contractValues.length 
      : 0

    // Contract completion rate
    const completedCount = contractsOverTime?.filter(c => c.status === 'completed').length || 0
    const totalCount = contractsOverTime?.length || 0
    const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        contractsOverTime: dailyContracts,
        cropDistribution,
        metrics: {
          totalContracts: totalCount,
          avgContractValue,
          completionRate,
          totalValue: contractValues.reduce((sum, val) => sum + val, 0)
        },
        timeframe: {
          start: dateFilter.start,
          end: dateFilter.end,
          period: timeframe
        }
      }
    })

  } catch (error) {
    console.error('Contract metrics error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch contract metrics'
    }, { status: 500 })
  }
}

async function handleUserMetrics(timeframe: string, startDate?: string | null, endDate?: string | null) {
  const supabase = await createClient()
  
  const dateFilter = getDateFilter(timeframe, startDate, endDate)
  
  try {
    // User registration over time
    const { data: usersOverTime } = await supabase
      .from('profiles')
      .select('created_at, user_type, location')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end)
      .order('created_at', { ascending: true })

    // Group by date
    const dailyUsers = groupByDate(usersOverTime || [], 'created_at')

    // User type distribution
    const userTypeDistribution = usersOverTime?.reduce((acc: any, user) => {
      acc[user.user_type] = (acc[user.user_type] || 0) + 1
      return acc
    }, {}) || {}

    // Geographic distribution
    const locationDistribution = usersOverTime?.reduce((acc: any, user) => {
      if (user.location) {
        acc[user.location] = (acc[user.location] || 0) + 1
      }
      return acc
    }, {}) || {}

    // Activity metrics - messages sent
    const { data: messageActivity } = await supabase
      .from('messages')
      .select('created_at, sender_id')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end)

    const activeUsers = new Set(messageActivity?.map(m => m.sender_id)).size

    return NextResponse.json({
      success: true,
      data: {
        usersOverTime: dailyUsers,
        userTypeDistribution,
        locationDistribution: Object.entries(locationDistribution)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 10),
        metrics: {
          totalUsers: usersOverTime?.length || 0,
          activeUsers,
          farmerCount: userTypeDistribution.farmer || 0,
          buyerCount: userTypeDistribution.buyer || 0
        },
        timeframe: {
          start: dateFilter.start,
          end: dateFilter.end,
          period: timeframe
        }
      }
    })

  } catch (error) {
    console.error('User metrics error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user metrics'
    }, { status: 500 })
  }
}

async function handleRevenueMetrics(timeframe: string, startDate?: string | null, endDate?: string | null) {
  const supabase = await createClient()
  
  const dateFilter = getDateFilter(timeframe, startDate, endDate)
  
  try {
    // Revenue from completed contracts
    const { data: completedContracts } = await supabase
      .from('contracts')
      .select('created_at, quantity, price_per_unit, crop_type, end_date')
      .eq('status', 'completed')
      .gte('end_date', dateFilter.start)
      .lte('end_date', dateFilter.end)
      .order('end_date', { ascending: true })

    // Calculate daily revenue
    const revenueOverTime = groupByDate(
      completedContracts?.map(contract => ({
        ...contract,
        created_at: contract.end_date,
        revenue: contract.quantity * contract.price_per_unit
      })) || [],
      'created_at',
      'revenue'
    )

    // Revenue by crop type
    const revenueBySource = completedContracts?.reduce((acc: any, contract) => {
      const revenue = contract.quantity * contract.price_per_unit
      acc[contract.crop_type] = (acc[contract.crop_type] || 0) + revenue
      return acc
    }, {}) || {}

    const totalRevenue = Object.values(revenueBySource).reduce((sum: number, val) => sum + (val as number), 0)

    // Payment analytics
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, status, created_at, payment_method')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end)

    const paymentsByMethod = payments?.reduce((acc: any, payment) => {
      acc[payment.payment_method] = (acc[payment.payment_method] || 0) + payment.amount
      return acc
    }, {}) || {}

    const successfulPayments = payments?.filter(p => p.status === 'completed') || []
    const paymentSuccessRate = (payments && payments.length > 0) 
      ? (successfulPayments.length / payments.length) * 100 
      : 0

    return NextResponse.json({
      success: true,
      data: {
        revenueOverTime,
        revenueBySource: Object.entries(revenueBySource)
          .sort(([,a], [,b]) => (b as number) - (a as number)),
        paymentsByMethod,
        metrics: {
          totalRevenue,
          avgTransactionValue: (payments && payments.length > 0) 
            ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length 
            : 0,
          paymentSuccessRate,
          totalTransactions: payments?.length || 0
        },
        timeframe: {
          start: dateFilter.start,
          end: dateFilter.end,
          period: timeframe
        }
      }
    })

  } catch (error) {
    console.error('Revenue metrics error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch revenue metrics'
    }, { status: 500 })
  }
}

async function handleEngagementMetrics(timeframe: string, startDate?: string | null, endDate?: string | null) {
  const supabase = await createClient()
  
  const dateFilter = getDateFilter(timeframe, startDate, endDate)
  
  try {
    // Message activity
    const { data: messages } = await supabase
      .from('messages')
      .select('created_at, conversation_id, sender_id')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end)

    const messagesOverTime = groupByDate(messages || [], 'created_at')
    const uniqueConversations = new Set(messages?.map(m => m.conversation_id)).size
    const activeMessagers = new Set(messages?.map(m => m.sender_id)).size

    // Search activity
    const { data: searches } = await supabase
      .from('search_analytics')
      .select('created_at, search_query, results_count')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end)

    const searchesOverTime = groupByDate(searches || [], 'created_at')
    const avgSearchResults = (searches && searches.length > 0) 
      ? searches.reduce((sum, s) => sum + s.results_count, 0) / searches.length 
      : 0

    // File uploads
    const { data: fileUploads } = await supabase
      .from('file_uploads')
      .select('created_at, file_type, file_size')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end)

    const uploadsOverTime = groupByDate(fileUploads || [], 'created_at')
    const totalStorageUsed = fileUploads?.reduce((sum, file) => sum + file.file_size, 0) || 0

    return NextResponse.json({
      success: true,
      data: {
        messaging: {
          messagesOverTime,
          metrics: {
            totalMessages: messages?.length || 0,
            uniqueConversations,
            activeMessagers
          }
        },
        search: {
          searchesOverTime,
          metrics: {
            totalSearches: searches?.length || 0,
            avgSearchResults
          }
        },
        fileUploads: {
          uploadsOverTime,
          metrics: {
            totalUploads: fileUploads?.length || 0,
            totalStorageUsed: Math.round(totalStorageUsed / (1024 * 1024)) // MB
          }
        },
        timeframe: {
          start: dateFilter.start,
          end: dateFilter.end,
          period: timeframe
        }
      }
    })

  } catch (error) {
    console.error('Engagement metrics error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch engagement metrics'
    }, { status: 500 })
  }
}

async function handleGeographyMetrics(timeframe: string, startDate?: string | null, endDate?: string | null) {
  const supabase = await createClient()
  
  const dateFilter = getDateFilter(timeframe, startDate, endDate)
  
  try {
    // Contract distribution by location
    const { data: contractLocations } = await supabase
      .from('contracts')
      .select('location, quantity, price_per_unit, latitude, longitude')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end)
      .not('location', 'is', null)

    const locationDistribution = contractLocations?.reduce((acc: any, contract) => {
      if (!acc[contract.location]) {
        acc[contract.location] = {
          count: 0,
          totalValue: 0,
          coordinates: contract.latitude && contract.longitude ? {
            lat: contract.latitude,
            lng: contract.longitude
          } : null
        }
      }
      acc[contract.location].count += 1
      acc[contract.location].totalValue += contract.quantity * contract.price_per_unit
      return acc
    }, {}) || {}

    // User distribution by location
    const { data: userLocations } = await supabase
      .from('profiles')
      .select('location, user_type, latitude, longitude')
      .gte('created_at', dateFilter.start)
      .lte('created_at', dateFilter.end)
      .not('location', 'is', null)

    const userLocationDistribution = userLocations?.reduce((acc: any, user) => {
      if (!acc[user.location]) {
        acc[user.location] = {
          farmers: 0,
          buyers: 0,
          total: 0,
          coordinates: user.latitude && user.longitude ? {
            lat: user.latitude,
            lng: user.longitude
          } : null
        }
      }
      acc[user.location].total += 1
      if (user.user_type === 'farmer') acc[user.location].farmers += 1
      if (user.user_type === 'buyer') acc[user.location].buyers += 1
      return acc
    }, {}) || {}

    return NextResponse.json({
      success: true,
      data: {
        contractsByLocation: Object.entries(locationDistribution)
          .sort(([,a], [,b]) => (b as any).count - (a as any).count),
        usersByLocation: Object.entries(userLocationDistribution)
          .sort(([,a], [,b]) => (b as any).total - (a as any).total),
        metrics: {
          totalLocations: Object.keys(locationDistribution).length,
          totalUserLocations: Object.keys(userLocationDistribution).length
        },
        timeframe: {
          start: dateFilter.start,
          end: dateFilter.end,
          period: timeframe
        }
      }
    })

  } catch (error) {
    console.error('Geography metrics error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch geography metrics'
    }, { status: 500 })
  }
}

// Helper functions
function getDateFilter(timeframe: string, startDate?: string | null, endDate?: string | null) {
  const end = endDate ? new Date(endDate) : new Date()
  let start: Date

  if (startDate) {
    start = new Date(startDate)
  } else {
    switch (timeframe) {
      case '7d':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate())
        break
      default:
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
  }

  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}

function groupByDate(data: any[], dateField: string, valueField?: string) {
  const grouped = data.reduce((acc: any, item) => {
    const date = new Date(item[dateField]).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = valueField ? 0 : 0
    }
    if (valueField) {
      acc[date] += item[valueField] || 0
    } else {
      acc[date] += 1
    }
    return acc
  }, {})

  return Object.entries(grouped).map(([date, value]) => ({
    date,
    value
  }))
}