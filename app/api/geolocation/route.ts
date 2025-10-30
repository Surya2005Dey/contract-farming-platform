import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  calculateDistance, 
  isValidCoordinates,
  formatDistance,
  type LocationCoordinates 
} from '@/lib/geolocation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'nearby-contracts':
        return handleNearbyContracts(searchParams)
      case 'nearby-profiles':
        return handleNearbyProfiles(searchParams)
      case 'location-analytics':
        return handleLocationAnalytics(searchParams)
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: nearby-contracts, nearby-profiles, location-analytics'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Geolocation API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'log-search':
        return handleLogSearch(body)
      case 'update-location':
        return handleUpdateLocation(body)
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Geolocation API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

async function handleNearbyContracts(searchParams: URLSearchParams) {
  const supabase = await createClient()
  
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const radius = parseInt(searchParams.get('radius') || '50')
  const cropType = searchParams.get('cropType')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!isValidCoordinates({ latitude: lat, longitude: lng })) {
    return NextResponse.json({
      success: false,
      error: 'Invalid coordinates'
    }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('find_nearby_contracts', {
    search_lat: lat,
    search_lng: lng,
    radius_km: radius,
    crop_type_filter: cropType,
    status_filter: status,
    limit_count: limit
  })

  if (error) {
    console.error('Database error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to find nearby contracts'
    }, { status: 500 })
  }

  // Log the search
  try {
    await supabase.rpc('log_location_search', {
      search_type_param: 'nearby-contracts',
      search_lat: lat,
      search_lng: lng,
      search_radius_param: radius,
      results_count_param: data?.length || 0,
      search_filters_param: JSON.stringify({ cropType, status, limit })
    })
  } catch (logError) {
    console.warn('Failed to log search:', logError)
  }

  return NextResponse.json({
    success: true,
    data: data || [],
    metadata: {
      searchLocation: { latitude: lat, longitude: lng },
      radius,
      radiusUnit: 'km',
      resultsCount: data?.length || 0,
      filters: { cropType, status }
    }
  })
}

async function handleNearbyProfiles(searchParams: URLSearchParams) {
  const supabase = await createClient()
  
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const radius = parseInt(searchParams.get('radius') || '50')
  const userType = searchParams.get('userType')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!isValidCoordinates({ latitude: lat, longitude: lng })) {
    return NextResponse.json({
      success: false,
      error: 'Invalid coordinates'
    }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('find_nearby_profiles', {
    search_lat: lat,
    search_lng: lng,
    radius_km: radius,
    user_type_filter: userType,
    limit_count: limit
  })

  if (error) {
    console.error('Database error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to find nearby profiles'
    }, { status: 500 })
  }

  // Log the search
  try {
    await supabase.rpc('log_location_search', {
      search_type_param: 'nearby-profiles',
      search_lat: lat,
      search_lng: lng,
      search_radius_param: radius,
      results_count_param: data?.length || 0,
      search_filters_param: JSON.stringify({ userType, limit })
    })
  } catch (logError) {
    console.warn('Failed to log search:', logError)
  }

  return NextResponse.json({
    success: true,
    data: data || [],
    metadata: {
      searchLocation: { latitude: lat, longitude: lng },
      radius,
      radiusUnit: 'km',
      resultsCount: data?.length || 0,
      filters: { userType }
    }
  })
}

async function handleLocationAnalytics(searchParams: URLSearchParams) {
  const supabase = await createClient()
  
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const radius = parseInt(searchParams.get('radius') || '100')

  if (!isValidCoordinates({ latitude: lat, longitude: lng })) {
    return NextResponse.json({
      success: false,
      error: 'Invalid coordinates'
    }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('get_location_analytics', {
    search_lat: lat,
    search_lng: lng,
    radius_km: radius
  })

  if (error) {
    console.error('Database error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get location analytics'
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: data || {},
    metadata: {
      searchLocation: { latitude: lat, longitude: lng },
      radius,
      radiusUnit: 'km'
    }
  })
}

async function handleLogSearch(body: any) {
  const supabase = await createClient()
  
  const {
    searchType,
    latitude,
    longitude,
    address,
    radius,
    resultsCount,
    filters = {}
  } = body

  try {
    const { data, error } = await supabase.rpc('log_location_search', {
      search_type_param: searchType,
      search_lat: latitude,
      search_lng: longitude,
      search_address_param: address,
      search_radius_param: radius,
      results_count_param: resultsCount,
      search_filters_param: JSON.stringify(filters)
    })

    if (error) {
      console.error('Failed to log search:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to log search'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { searchId: data }
    })
  } catch (error) {
    console.error('Search logging error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to log search'
    }, { status: 500 })
  }
}

async function handleUpdateLocation(body: any) {
  const supabase = await createClient()
  
  const {
    entityType, // 'profile' or 'contract'
    entityId,
    latitude,
    longitude,
    address,
    locationAccuracy
  } = body

  if (!isValidCoordinates({ latitude, longitude })) {
    return NextResponse.json({
      success: false,
      error: 'Invalid coordinates'
    }, { status: 400 })
  }

  try {
    let updateData: any = {
      latitude,
      longitude
    }

    if (address) {
      updateData.location = address
    }

    if (entityType === 'profile' && locationAccuracy) {
      updateData.location_accuracy = locationAccuracy
    }

    const tableName = entityType === 'profile' ? 'profiles' : 'contracts'
    const idColumn = entityType === 'profile' ? 'user_id' : 'id'

    const { data, error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq(idColumn, entityId)
      .select()

    if (error) {
      console.error('Failed to update location:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to update location'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data?.[0] || null
    })
  } catch (error) {
    console.error('Location update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update location'
    }, { status: 500 })
  }
}

// Helper function to calculate distances on the client side (for backup/verification)
export async function calculateDistances(
  referencePoint: LocationCoordinates,
  points: Array<{ id: string; coordinates: LocationCoordinates }>
) {
  return points.map(point => ({
    ...point,
    distance: calculateDistance(referencePoint, point.coordinates),
    formattedDistance: formatDistance(
      calculateDistance(referencePoint, point.coordinates)
    )
  }))
}