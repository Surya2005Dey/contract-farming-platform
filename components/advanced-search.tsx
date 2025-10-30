'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  Filter, 
  X, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Package, 
  User,
  FileText,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface SearchFilters {
  cropTypes?: string[]
  minPrice?: number
  maxPrice?: number
  minQuantity?: number
  maxQuantity?: number
  statuses?: string[]
  location?: string
  startDateFrom?: Date
  startDateTo?: Date
  userTypes?: string[]
  hasRating?: boolean
  sortBy?: string
  sortOrder?: string
}

interface SearchResult {
  id: string
  type: 'contract' | 'profile' | 'template'
  [key: string]: any
}

interface SearchResponse {
  success: boolean
  data: SearchResult[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
  metadata: {
    searchQuery: string
    searchType: string
    resultsCount: number
    searchDuration: number
    appliedFilters: SearchFilters
  }
}

const CROP_TYPES = [
  'Wheat', 'Rice', 'Corn', 'Soybeans', 'Cotton', 'Barley', 'Oats', 
  'Tomatoes', 'Potatoes', 'Onions', 'Carrots', 'Lettuce', 'Cabbage',
  'Apples', 'Oranges', 'Bananas', 'Grapes', 'Strawberries'
]

const CONTRACT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open for Bids' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

const USER_TYPES = [
  { value: 'farmer', label: 'Farmer' },
  { value: 'buyer', label: 'Buyer' }
]

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date', label: 'Date' },
  { value: 'price', label: 'Price' },
  { value: 'quantity', label: 'Quantity' }
]

export function AdvancedSearch() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('contracts')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false
  })
  const [metadata, setMetadata] = useState<any>(null)
  const [showFilters, setShowFilters] = useState(false)

  const debouncedQuery = useDebounce(query, 300)
  const { toast } = useToast()

  const performSearch = useCallback(async (page = 1, newFilters = filters) => {
    if (!debouncedQuery && Object.keys(newFilters).length === 0) {
      setResults([])
      return
    }

    setLoading(true)

    try {
      const searchParams = new URLSearchParams({
        q: debouncedQuery,
        type: searchType,
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(newFilters).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(',') : value?.toString() || ''
          ]).filter(([, value]) => value !== '')
        )
      })

      const response = await fetch(`/api/search?${searchParams}`)
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data: SearchResponse = await response.json()
      
      if (page === 1) {
        setResults(data.data)
      } else {
        setResults(prev => [...prev, ...data.data])
      }
      
      setPagination(data.pagination)
      setMetadata(data.metadata)

    } catch (error) {
      toast({
        title: 'Search Error',
        description: 'Failed to perform search. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, searchType, filters, pagination.limit, toast])

  useEffect(() => {
    performSearch(1)
  }, [debouncedQuery, searchType])

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    performSearch(1, newFilters)
  }

  const clearFilters = () => {
    setFilters({})
    performSearch(1, {})
  }

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      performSearch(pagination.page + 1)
    }
  }

  const trackClick = async (result: SearchResult) => {
    try {
      await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultId: result.id,
          resultType: result.type || searchType,
          searchQuery: debouncedQuery,
          searchType
        })
      })
    } catch (error) {
      // Ignore tracking errors
    }
  }

  const ResultCard = ({ result }: { result: SearchResult }) => {
    if (searchType === 'contracts') {
      return (
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => trackClick(result)}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{result.title || `${result.crop_type} Contract`}</CardTitle>
                <CardDescription className="flex items-center space-x-2">
                  <span>{result.crop_type}</span>
                  <span>•</span>
                  <span>{result.quantity} units</span>
                  <span>•</span>
                  <span>${result.price_per_unit}/unit</span>
                </CardDescription>
              </div>
              <Badge variant={result.status === 'open' ? 'default' : 'secondary'}>
                {result.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {result.description}
            </p>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{result.location || 'Not specified'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{result.farmer_name}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">${(result.quantity * result.price_per_unit).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (searchType === 'profiles') {
      return (
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => trackClick(result)}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{result.full_name}</h3>
                {result.company_name && (
                  <p className="text-sm text-muted-foreground">{result.company_name}</p>
                )}
                <div className="flex items-center space-x-4 mt-2">
                  <Badge variant="outline">{result.user_type}</Badge>
                  {result.location && (
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{result.location}</span>
                    </div>
                  )}
                  {result.avg_rating && (
                    <div className="flex items-center space-x-1 text-sm">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{result.avg_rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {result.bio && (
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                {result.bio}
              </p>
            )}
          </CardContent>
        </Card>
      )
    }

    return null
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Advanced Search</span>
          </CardTitle>
          <CardDescription>
            Find contracts, farmers, buyers, and templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for contracts, profiles, or templates..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {Object.keys(filters).length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Search Type Tabs */}
          <Tabs value={searchType} onValueChange={setSearchType}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="contracts">Contracts</TabsTrigger>
              <TabsTrigger value="profiles">Profiles</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Applied Filters */}
          {Object.keys(filters).length > 0 && (
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-sm font-medium">Active filters:</span>
              {Object.entries(filters).map(([key, value]) => (
                <Badge key={key} variant="secondary" className="flex items-center space-x-1">
                  <span>{key}: {Array.isArray(value) ? value.join(', ') : value?.toString()}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => handleFilterChange(key, undefined)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {searchType === 'contracts' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Crop Types */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Crop Types</label>
                  <Select
                    value={filters.cropTypes?.[0] || ''}
                    onValueChange={(value) => handleFilterChange('cropTypes', value ? [value] : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select crop type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CROP_TYPES.map((crop) => (
                        <SelectItem key={crop} value={crop}>
                          {crop}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={filters.statuses?.[0] || ''}
                    onValueChange={(value) => handleFilterChange('statuses', value ? [value] : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <Input
                    placeholder="Enter location"
                    value={filters.location || ''}
                    onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                  />
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Price Range (per unit)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min price"
                      value={filters.minPrice || ''}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <Input
                      type="number"
                      placeholder="Max price"
                      value={filters.maxPrice || ''}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* Quantity Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Quantity Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min quantity"
                      value={filters.minQuantity || ''}
                      onChange={(e) => handleFilterChange('minQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                    <Input
                      type="number"
                      placeholder="Max quantity"
                      value={filters.maxQuantity || ''}
                      onChange={(e) => handleFilterChange('maxQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <Select
                    value={filters.sortBy || 'relevance'}
                    onValueChange={(value) => handleFilterChange('sortBy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {searchType === 'profiles' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* User Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">User Type</label>
                  <Select
                    value={filters.userTypes?.[0] || ''}
                    onValueChange={(value) => handleFilterChange('userTypes', value ? [value] : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <Input
                    placeholder="Enter location"
                    value={filters.location || ''}
                    onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                  />
                </div>

                {/* Has Rating */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasRating"
                    checked={filters.hasRating || false}
                    onCheckedChange={(checked) => handleFilterChange('hasRating', checked || undefined)}
                  />
                  <label htmlFor="hasRating" className="text-sm font-medium">
                    Has rating
                  </label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Search Results</CardTitle>
              {metadata && (
                <CardDescription>
                  {metadata.resultsCount} results found in {metadata.searchDuration}ms
                  {metadata.searchQuery && ` for "${metadata.searchQuery}"`}
                </CardDescription>
              )}
            </div>
            {pagination.total > 0 && (
              <Badge variant="outline">
                {pagination.total} total
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading && results.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto mb-2 text-muted-foreground animate-pulse" />
              <p>Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No results found</p>
              <p className="text-sm">Try adjusting your search query or filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <ResultCard key={result.id} result={result} />
              ))}

              {pagination.hasMore && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}