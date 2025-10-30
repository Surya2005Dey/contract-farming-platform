'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MapPin, 
  Navigation, 
  Users, 
  FileText, 
  DollarSign,
  Star,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { LocationPicker } from '@/components/location-picker'
import { 
  getCurrentLocation, 
  formatDistance,
  type GeolocationData,
  type LocationCoordinates 
} from '@/lib/geolocation'
import { formatDistanceToNow } from 'date-fns'

interface NearbyContract {
  id: string
  title: string
  description: string
  crop_type: string
  quantity: number
  price_per_unit: number
  status: string
  location: string
  latitude: number
  longitude: number
  distance_km: number
  farmer_name: string
  start_date: string
  end_date: string
  created_at: string
}

interface NearbyProfile {
  id: string
  full_name: string
  user_type: string
  company_name?: string
  location: string
  bio?: string
  latitude: number
  longitude: number
  distance_km: number
  avg_rating: number
}

interface LocationAnalytics {
  total_contracts: number
  active_contracts: number
  total_farmers: number
  total_buyers: number
  avg_contract_value: number
  popular_crops: Array<{
    crop_type: string
    count: number
  }>
}

export function NearbySearch() {
  const [currentLocation, setCurrentLocation] = useState<GeolocationData | null>(null)
  const [searchRadius, setSearchRadius] = useState([25])
  const [loading, setLoading] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  
  // Results
  const [contracts, setContracts] = useState<NearbyContract[]>([])
  const [profiles, setProfiles] = useState<NearbyProfile[]>([])
  const [analytics, setAnalytics] = useState<LocationAnalytics | null>(null)
  
  // Filters
  const [contractCropFilter, setContractCropFilter] = useState<string>('')
  const [contractStatusFilter, setContractStatusFilter] = useState<string>('')
  const [profileTypeFilter, setProfileTypeFilter] = useState<string>('')

  const { toast } = useToast()

  useEffect(() => {
    // Try to get current location on component mount
    handleGetCurrentLocation()
  }, [])

  useEffect(() => {
    if (currentLocation) {
      performSearch()
    }
  }, [currentLocation, searchRadius])

  const handleGetCurrentLocation = async () => {
    setGettingLocation(true)
    try {
      const location = await getCurrentLocation()
      setCurrentLocation(location)
      toast({
        title: 'Location Found',
        description: 'Searching for nearby contracts and profiles...',
      })
    } catch (error) {
      toast({
        title: 'Location Error',
        description: 'Could not get your current location. Please set it manually.',
        variant: 'destructive'
      })
    } finally {
      setGettingLocation(false)
    }
  }

  const performSearch = async () => {
    if (!currentLocation) return

    setLoading(true)
    
    try {
      const radius = searchRadius[0]
      const { latitude, longitude } = currentLocation.coordinates

      // Search contracts
      const contractsResponse = await fetch(
        `/api/geolocation?action=nearby-contracts&lat=${latitude}&lng=${longitude}&radius=${radius}&cropType=${contractCropFilter}&status=${contractStatusFilter}`
      )
      
      if (contractsResponse.ok) {
        const contractsData = await contractsResponse.json()
        setContracts(contractsData.data || [])
      }

      // Search profiles
      const profilesResponse = await fetch(
        `/api/geolocation?action=nearby-profiles&lat=${latitude}&lng=${longitude}&radius=${radius}&userType=${profileTypeFilter}`
      )
      
      if (profilesResponse.ok) {
        const profilesData = await profilesResponse.json()
        setProfiles(profilesData.data || [])
      }

      // Get analytics
      const analyticsResponse = await fetch(
        `/api/geolocation?action=location-analytics&lat=${latitude}&lng=${longitude}&radius=${radius}`
      )
      
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        setAnalytics(analyticsData.data || null)
      }

    } catch (error) {
      toast({
        title: 'Search Error',
        description: 'Failed to search for nearby items. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLocationSelect = (location: GeolocationData) => {
    setCurrentLocation(location)
  }

  const handleRadiusChange = (value: number[]) => {
    setSearchRadius(value)
  }

  const ContractCard = ({ contract }: { contract: NearbyContract }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium line-clamp-1">{contract.title}</h3>
              <p className="text-sm text-muted-foreground">{contract.crop_type}</p>
            </div>
            <Badge variant={contract.status === 'open' ? 'default' : 'secondary'}>
              {contract.status}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {contract.description}
          </p>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center space-x-1">
              <DollarSign className="h-3 w-3" />
              <span>${contract.price_per_unit}/unit</span>
            </div>
            <div className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>{contract.quantity} units</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{formatDistance(contract.distance_km)} away</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {contract.farmer_name}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const ProfileCard = ({ profile }: { profile: NearbyProfile }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium">{profile.full_name}</h3>
              {profile.company_name && (
                <p className="text-sm text-muted-foreground">{profile.company_name}</p>
              )}
            </div>
            <Badge variant="outline">{profile.user_type}</Badge>
          </div>
          
          {profile.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {profile.bio}
            </p>
          )}
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{formatDistance(profile.distance_km)} away</span>
            </div>
            {profile.avg_rating > 0 && (
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{profile.avg_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Location Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          initialLocation={currentLocation || undefined}
          showCurrentLocation={true}
        />
        
        {/* Search Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Search Settings</CardTitle>
            <CardDescription>
              Adjust search radius and filters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Radius */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Search Radius</label>
                <span className="text-sm text-muted-foreground">
                  {searchRadius[0]} km
                </span>
              </div>
              <Slider
                value={searchRadius}
                onValueChange={handleRadiusChange}
                min={5}
                max={200}
                step={5}
                className="w-full"
              />
            </div>

            {/* Get Current Location Button */}
            <Button
              onClick={handleGetCurrentLocation}
              disabled={gettingLocation}
              variant="outline"
              className="w-full"
            >
              {gettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              {gettingLocation ? 'Getting Location...' : 'Use Current Location'}
            </Button>

            {/* Search Button */}
            <Button
              onClick={performSearch}
              disabled={loading || !currentLocation}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Searching...' : 'Search Nearby'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle>Local Market Overview</CardTitle>
            <CardDescription>
              Statistics for your area ({searchRadius[0]} km radius)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-primary">{analytics.total_contracts}</div>
                <div className="text-sm text-muted-foreground">Total Contracts</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-green-600">{analytics.active_contracts}</div>
                <div className="text-sm text-muted-foreground">Active Contracts</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-blue-600">{analytics.total_farmers}</div>
                <div className="text-sm text-muted-foreground">Farmers</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-purple-600">{analytics.total_buyers}</div>
                <div className="text-sm text-muted-foreground">Buyers</div>
              </div>
            </div>
            
            {analytics.popular_crops && analytics.popular_crops.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Popular Crops</h4>
                <div className="flex flex-wrap gap-2">
                  {analytics.popular_crops.slice(0, 5).map((crop) => (
                    <Badge key={crop.crop_type} variant="secondary">
                      {crop.crop_type} ({crop.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Tabs defaultValue="contracts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contracts" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Contracts ({contracts.length})</span>
          </TabsTrigger>
          <TabsTrigger value="profiles" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Profiles ({profiles.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-4">
          {/* Contract Filters */}
          <div className="flex space-x-2">
            <Select value={contractCropFilter} onValueChange={setContractCropFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Crop type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All crops</SelectItem>
                <SelectItem value="Wheat">Wheat</SelectItem>
                <SelectItem value="Rice">Rice</SelectItem>
                <SelectItem value="Corn">Corn</SelectItem>
                <SelectItem value="Soybeans">Soybeans</SelectItem>
              </SelectContent>
            </Select>

            <Select value={contractStatusFilter} onValueChange={setContractStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={performSearch} variant="outline" size="sm">
              Apply Filters
            </Button>
          </div>

          {/* Contracts Results */}
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Searching for nearby contracts...</p>
                </div>
              ) : contracts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No contracts found in your area
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try increasing the search radius or adjusting filters
                    </p>
                  </CardContent>
                </Card>
              ) : (
                contracts.map((contract) => (
                  <ContractCard key={contract.id} contract={contract} />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          {/* Profile Filters */}
          <div className="flex space-x-2">
            <Select value={profileTypeFilter} onValueChange={setProfileTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="User type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All users</SelectItem>
                <SelectItem value="farmer">Farmers</SelectItem>
                <SelectItem value="buyer">Buyers</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={performSearch} variant="outline" size="sm">
              Apply Filters
            </Button>
          </div>

          {/* Profiles Results */}
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Searching for nearby profiles...</p>
                </div>
              ) : profiles.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No profiles found in your area
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try increasing the search radius or adjusting filters
                    </p>
                  </CardContent>
                </Card>
              ) : (
                profiles.map((profile) => (
                  <ProfileCard key={profile.id} profile={profile} />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}