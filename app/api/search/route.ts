import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Get search parameters
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'contracts'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    // Contract search filters
    const cropTypes = searchParams.get('cropTypes')?.split(',').filter(Boolean) || null
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null
    const minQuantity = searchParams.get('minQuantity') ? parseInt(searchParams.get('minQuantity')!) : null
    const maxQuantity = searchParams.get('maxQuantity') ? parseInt(searchParams.get('maxQuantity')!) : null
    const statuses = searchParams.get('statuses')?.split(',').filter(Boolean) || null
    const location = searchParams.get('location') || null
    const startDateFrom = searchParams.get('startDateFrom') || null
    const startDateTo = searchParams.get('startDateTo') || null
    const farmerId = searchParams.get('farmerId') || null
    const buyerId = searchParams.get('buyerId') || null
    const sortBy = searchParams.get('sortBy') || 'relevance'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Profile search filters
    const userTypes = searchParams.get('userTypes')?.split(',').filter(Boolean) || null
    const hasRating = searchParams.get('hasRating') ? searchParams.get('hasRating') === 'true' : null

    const startTime = Date.now()
    let results: any[] = []
    let totalCount = 0

    // Get authenticated user for analytics
    const { data: { user } } = await supabase.auth.getUser()

    if (type === 'contracts') {
      // Use the advanced contract search function
      const { data: contractResults, error } = await supabase
        .rpc('advanced_contract_search', {
          search_query: query,
          crop_types: cropTypes,
          min_price: minPrice,
          max_price: maxPrice,
          min_quantity: minQuantity,
          max_quantity: maxQuantity,
          contract_status: statuses,
          location_filter: location,
          start_date_from: startDateFrom,
          start_date_to: startDateTo,
          farmer_id_filter: farmerId,
          buyer_id_filter: buyerId,
          sort_by: sortBy,
          sort_order: sortOrder,
          limit_count: limit,
          offset_count: offset
        })

      if (error) {
        console.error('Contract search error:', error)
        return NextResponse.json(
          { error: 'Search failed', details: error.message },
          { status: 500 }
        )
      }

      results = contractResults || []

      // Get total count for pagination (simplified version without all filters for performance)
      const { count } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .or(query ? `search_vector.wfts.${query}` : 'id.neq.null')

      totalCount = count || 0

    } else if (type === 'profiles') {
      // Use the profile search function
      const { data: profileResults, error } = await supabase
        .rpc('search_profiles', {
          search_query: query,
          user_types: userTypes,
          location_filter: location,
          has_rating: hasRating,
          limit_count: limit,
          offset_count: offset
        })

      if (error) {
        console.error('Profile search error:', error)
        return NextResponse.json(
          { error: 'Search failed', details: error.message },
          { status: 500 }
        )
      }

      results = profileResults || []

      // Get total count
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .or(query ? `search_vector.wfts.${query}` : 'id.neq.null')

      totalCount = count || 0

    } else if (type === 'templates') {
      // Search contract templates
      let templateQuery = supabase
        .from('contract_templates')
        .select('*, creator:profiles!contract_templates_created_by_fkey(full_name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (query) {
        templateQuery = templateQuery.textSearch('search_vector', query, {
          type: 'websearch',
          config: 'farming_search'
        })
      }

      const { data: templateResults, error, count } = await templateQuery

      if (error) {
        console.error('Template search error:', error)
        return NextResponse.json(
          { error: 'Search failed', details: error.message },
          { status: 500 }
        )
      }

      results = templateResults || []
      totalCount = count || 0

    } else {
      return NextResponse.json(
        { error: 'Invalid search type' },
        { status: 400 }
      )
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    // Log search analytics (optional, don't block response)
    if (user && query) {
      try {
        await supabase
          .from('search_analytics')
          .insert({
            user_id: user.id,
            search_query: query,
            search_type: type,
            filters_applied: {
              cropTypes,
              minPrice,
              maxPrice,
              minQuantity,
              maxQuantity,
              statuses,
              location,
              startDateFrom,
              startDateTo,
              userTypes,
              hasRating,
              sortBy,
              sortOrder
            },
            results_count: results.length,
            search_duration_ms: duration
          })
      } catch (analyticsError) {
        // Ignore analytics errors - don't block the search response
        console.log('Analytics logging failed:', analyticsError)
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + results.length < totalCount
      },
      metadata: {
        searchQuery: query,
        searchType: type,
        resultsCount: results.length,
        searchDuration: duration,
        appliedFilters: {
          cropTypes,
          minPrice,
          maxPrice,
          minQuantity,
          maxQuantity,
          statuses,
          location,
          startDateFrom,
          startDateTo,
          userTypes,
          hasRating,
          sortBy,
          sortOrder
        }
      }
    })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { resultId, resultType, searchQuery, searchType } = body

    if (!resultId || !resultType || !searchQuery || !searchType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Log the click for analytics
    await supabase
      .from('search_analytics')
      .insert({
        user_id: user.id,
        search_query: searchQuery,
        search_type: searchType,
        clicked_result_id: resultId,
        clicked_result_type: resultType,
        results_count: 1
      })

    return NextResponse.json({
      success: true,
      message: 'Click tracked successfully'
    })

  } catch (error) {
    console.error('Search click tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}