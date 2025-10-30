'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MapPin, 
  Navigation, 
  Search, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { 
  getCurrentLocation, 
  forwardGeocode, 
  formatLocation,
  type GeolocationData,
  type LocationCoordinates 
} from '@/lib/geolocation'

interface LocationPickerProps {
  onLocationSelect: (location: GeolocationData) => void
  initialLocation?: GeolocationData
  showCurrentLocation?: boolean
  placeholder?: string
  disabled?: boolean
}

export function LocationPicker({
  onLocationSelect,
  initialLocation,
  showCurrentLocation = true,
  placeholder = "Enter address or location",
  disabled = false
}: LocationPickerProps) {
  const [location, setLocation] = useState<GeolocationData | null>(initialLocation || null)
  const [addressInput, setAddressInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation)
      if (initialLocation.address) {
        setAddressInput(initialLocation.address)
      }
    }
  }, [initialLocation])

  const handleGetCurrentLocation = async () => {
    setGettingCurrentLocation(true)
    setError(null)

    try {
      const currentLocation = await getCurrentLocation()
      setLocation(currentLocation)
      setAddressInput(currentLocation.address || '')
      onLocationSelect(currentLocation)
      
      toast({
        title: 'Location Found',
        description: 'Your current location has been detected successfully.',
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get current location'
      setError(errorMessage)
      toast({
        title: 'Location Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setGettingCurrentLocation(false)
    }
  }

  const handleAddressSearch = async () => {
    if (!addressInput.trim()) return

    setLoading(true)
    setError(null)

    try {
      const coordinates = await forwardGeocode(addressInput.trim())
      
      if (coordinates) {
        const locationData: GeolocationData = {
          coordinates,
          address: addressInput.trim()
        }
        
        setLocation(locationData)
        onLocationSelect(locationData)
        
        toast({
          title: 'Address Found',
          description: 'Location coordinates found for the entered address.',
        })
      } else {
        setError('Address not found. Please try a different address.')
        toast({
          title: 'Address Not Found',
          description: 'Could not find coordinates for the entered address.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      const errorMessage = 'Failed to search for address'
      setError(errorMessage)
      toast({
        title: 'Search Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClearLocation = () => {
    setLocation(null)
    setAddressInput('')
    setError(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddressSearch()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <span>Location</span>
        </CardTitle>
        <CardDescription>
          Set your location for better matching and delivery options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location */}
        {showCurrentLocation && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleGetCurrentLocation}
              disabled={disabled || gettingCurrentLocation}
              className="flex items-center space-x-2"
            >
              {gettingCurrentLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              <span>
                {gettingCurrentLocation ? 'Getting Location...' : 'Use Current Location'}
              </span>
            </Button>
          </div>
        )}

        {/* Address Search */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Input
              placeholder={placeholder}
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={disabled}
              className="flex-1"
            />
            <Button
              onClick={handleAddressSearch}
              disabled={disabled || loading || !addressInput.trim()}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>Search</span>
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Selected Location Display */}
        {location && (
          <div className="space-y-3">
            <Separator />
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Location Selected</span>
                </div>
                
                <div className="space-y-1 text-sm text-muted-foreground">
                  {location.address && (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Address:</span>
                      <span>{location.address}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Coordinates:</span>
                    <span>
                      {location.coordinates.latitude.toFixed(6)}, {location.coordinates.longitude.toFixed(6)}
                    </span>
                  </div>
                  
                  {location.city && location.state && (
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Location:</span>
                      <span>{formatLocation(location)}</span>
                    </div>
                  )}
                </div>

                {/* Location Details */}
                <div className="flex flex-wrap gap-2">
                  {location.city && (
                    <Badge variant="secondary">{location.city}</Badge>
                  )}
                  {location.state && (
                    <Badge variant="secondary">{location.state}</Badge>
                  )}
                  {location.country && (
                    <Badge variant="outline">{location.country}</Badge>
                  )}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearLocation}
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Location Accuracy Info */}
        {location && (
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>
              Location accuracy may vary. For best results, use specific addresses rather than general locations.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}