// Geolocation utilities for contract farming platform

export interface LocationCoordinates {
  latitude: number
  longitude: number
}

export interface GeolocationData {
  coordinates: LocationCoordinates
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}

export interface DistanceCalculationOptions {
  unit?: 'km' | 'miles'
  precision?: number
}

export interface LocationSearchResult {
  id: string
  distance: number
  coordinates: LocationCoordinates
  formattedDistance: string
}

/**
 * Calculate distance between two geographic points using Haversine formula
 */
export function calculateDistance(
  point1: LocationCoordinates,
  point2: LocationCoordinates,
  options: DistanceCalculationOptions = {}
): number {
  const { unit = 'km', precision = 2 } = options

  const R = unit === 'km' ? 6371 : 3959 // Earth's radius in km or miles
  const dLat = toRadians(point2.latitude - point1.latitude)
  const dLon = toRadians(point2.longitude - point1.longitude)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) *
    Math.cos(toRadians(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Number(distance.toFixed(precision))
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number, unit: 'km' | 'miles' = 'km'): string {
  if (distance < 1) {
    const meters = Math.round(distance * (unit === 'km' ? 1000 : 5280))
    return `${meters} ${unit === 'km' ? 'm' : 'ft'}`
  }
  
  return `${distance} ${unit}`
}

/**
 * Get current user location using browser geolocation API
 */
export function getCurrentLocation(): Promise<GeolocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates: LocationCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }

        try {
          // Try to get address from coordinates
          const address = await reverseGeocode(coordinates)
          resolve({ coordinates, ...address })
        } catch (error) {
          // Return coordinates even if reverse geocoding fails
          resolve({ coordinates })
        }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('User denied the request for geolocation'))
            break
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is unavailable'))
            break
          case error.TIMEOUT:
            reject(new Error('The request to get user location timed out'))
            break
          default:
            reject(new Error('An unknown error occurred'))
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  })
}

/**
 * Reverse geocode coordinates to get human-readable address
 */
export async function reverseGeocode(coordinates: LocationCoordinates): Promise<Partial<GeolocationData>> {
  try {
    // Using OpenStreetMap Nominatim API for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.latitude}&lon=${coordinates.longitude}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Contract Farming Platform/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Reverse geocoding failed')
    }

    const data = await response.json()
    
    return {
      address: data.display_name,
      city: data.address?.city || data.address?.town || data.address?.village,
      state: data.address?.state,
      country: data.address?.country,
      postalCode: data.address?.postcode
    }
  } catch (error) {
    console.warn('Reverse geocoding failed:', error)
    return {}
  }
}

/**
 * Forward geocode an address to get coordinates
 */
export async function forwardGeocode(address: string): Promise<LocationCoordinates | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'Contract Farming Platform/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Forward geocoding failed')
    }

    const data = await response.json()
    
    if (data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      }
    }

    return null
  } catch (error) {
    console.warn('Forward geocoding failed:', error)
    return null
  }
}

/**
 * Check if location is within a certain radius
 */
export function isWithinRadius(
  center: LocationCoordinates,
  point: LocationCoordinates,
  radius: number,
  unit: 'km' | 'miles' = 'km'
): boolean {
  const distance = calculateDistance(center, point, { unit })
  return distance <= radius
}

/**
 * Sort locations by distance from a reference point
 */
export function sortByDistance<T extends { coordinates?: LocationCoordinates }>(
  items: T[],
  referencePoint: LocationCoordinates,
  unit: 'km' | 'miles' = 'km'
): (T & { distance: number; formattedDistance: string })[] {
  return items
    .filter(item => item.coordinates)
    .map(item => {
      const distance = calculateDistance(referencePoint, item.coordinates!, { unit })
      return {
        ...item,
        distance,
        formattedDistance: formatDistance(distance, unit)
      }
    })
    .sort((a, b) => a.distance - b.distance)
}

/**
 * Get location bounds for a given center and radius
 */
export function getLocationBounds(
  center: LocationCoordinates,
  radius: number,
  unit: 'km' | 'miles' = 'km'
): {
  north: number
  south: number
  east: number
  west: number
} {
  const R = unit === 'km' ? 6371 : 3959 // Earth's radius
  
  const latDelta = (radius / R) * (180 / Math.PI)
  const lonDelta = (radius / R) * (180 / Math.PI) / Math.cos(toRadians(center.latitude))

  return {
    north: center.latitude + latDelta,
    south: center.latitude - latDelta,
    east: center.longitude + lonDelta,
    west: center.longitude - lonDelta
  }
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(coordinates: LocationCoordinates): boolean {
  return (
    typeof coordinates.latitude === 'number' &&
    typeof coordinates.longitude === 'number' &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  )
}

/**
 * Generate a human-readable location string
 */
export function formatLocation(location: Partial<GeolocationData>): string {
  const parts: string[] = []
  
  if (location.city) parts.push(location.city)
  if (location.state) parts.push(location.state)
  if (location.country) parts.push(location.country)
  
  return parts.join(', ') || location.address || 'Unknown location'
}