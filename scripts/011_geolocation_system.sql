-- Add geolocation features to the contract farming platform
-- This script adds location coordinates, geospatial indexing, and location-based search

-- Enable PostGIS extension for geospatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add location coordinates to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_coordinates GEOGRAPHY(POINT, 4326),
ADD COLUMN IF NOT EXISTS location_accuracy INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add location coordinates to contracts
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_coordinates GEOGRAPHY(POINT, 4326),
ADD COLUMN IF NOT EXISTS delivery_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS delivery_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS delivery_coordinates GEOGRAPHY(POINT, 4326);

-- Create function to update location coordinates from lat/lng
CREATE OR REPLACE FUNCTION update_location_coordinates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update location_coordinates for profiles
  IF TG_TABLE_NAME = 'profiles' THEN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
      NEW.location_coordinates = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
      NEW.location_updated_at = NOW();
    ELSE
      NEW.location_coordinates = NULL;
    END IF;
  END IF;

  -- Update location_coordinates for contracts
  IF TG_TABLE_NAME = 'contracts' THEN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
      NEW.location_coordinates = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    ELSE
      NEW.location_coordinates = NULL;
    END IF;
    
    IF NEW.delivery_latitude IS NOT NULL AND NEW.delivery_longitude IS NOT NULL THEN
      NEW.delivery_coordinates = ST_SetSRID(ST_MakePoint(NEW.delivery_longitude, NEW.delivery_latitude), 4326);
    ELSE
      NEW.delivery_coordinates = NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic coordinate updates
DROP TRIGGER IF EXISTS update_profile_coordinates ON profiles;
CREATE TRIGGER update_profile_coordinates
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_location_coordinates();

DROP TRIGGER IF EXISTS update_contract_coordinates ON contracts;
CREATE TRIGGER update_contract_coordinates
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_location_coordinates();

-- Create spatial indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_location_coordinates 
ON profiles USING GIST (location_coordinates);

CREATE INDEX IF NOT EXISTS idx_contracts_location_coordinates 
ON contracts USING GIST (location_coordinates);

CREATE INDEX IF NOT EXISTS idx_contracts_delivery_coordinates 
ON contracts USING GIST (delivery_coordinates);

-- Create location search history table
CREATE TABLE IF NOT EXISTS location_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  search_type VARCHAR(50) NOT NULL, -- 'contracts', 'profiles', 'radius'
  search_location GEOGRAPHY(POINT, 4326),
  search_address TEXT,
  search_radius INTEGER, -- in kilometers
  results_count INTEGER DEFAULT 0,
  search_filters JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for location search history
CREATE INDEX IF NOT EXISTS idx_location_searches_user_id ON location_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_location_searches_location ON location_searches USING GIST (search_location);
CREATE INDEX IF NOT EXISTS idx_location_searches_created_at ON location_searches(created_at);

-- Create function to find nearby profiles
CREATE OR REPLACE FUNCTION find_nearby_profiles(
  search_lat DECIMAL(10, 8),
  search_lng DECIMAL(11, 8),
  radius_km INTEGER DEFAULT 50,
  user_type_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  user_type TEXT,
  company_name TEXT,
  location TEXT,
  bio TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_km DECIMAL(8, 2),
  avg_rating DECIMAL(3, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.user_type,
    p.company_name,
    p.location,
    p.bio,
    p.latitude,
    p.longitude,
    ROUND(
      ST_Distance(
        ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
        p.location_coordinates
      ) / 1000, 2
    ) AS distance_km,
    COALESCE(
      (SELECT AVG(rating)::DECIMAL(3,2) 
       FROM ratings r 
       WHERE r.rated_user_id = p.user_id),
      0
    ) AS avg_rating
  FROM profiles p
  WHERE 
    p.location_coordinates IS NOT NULL
    AND ST_DWithin(
      p.location_coordinates,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
      radius_km * 1000
    )
    AND (user_type_filter IS NULL OR p.user_type = user_type_filter)
  ORDER BY distance_km
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to find nearby contracts
CREATE OR REPLACE FUNCTION find_nearby_contracts(
  search_lat DECIMAL(10, 8),
  search_lng DECIMAL(11, 8),
  radius_km INTEGER DEFAULT 50,
  crop_type_filter TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  crop_type TEXT,
  quantity INTEGER,
  price_per_unit DECIMAL(10, 2),
  status TEXT,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_km DECIMAL(8, 2),
  farmer_name TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.description,
    c.crop_type,
    c.quantity,
    c.price_per_unit,
    c.status,
    c.location,
    c.latitude,
    c.longitude,
    ROUND(
      ST_Distance(
        ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
        c.location_coordinates
      ) / 1000, 2
    ) AS distance_km,
    p.full_name AS farmer_name,
    c.start_date,
    c.end_date,
    c.created_at
  FROM contracts c
  LEFT JOIN profiles p ON c.farmer_id = p.user_id
  WHERE 
    c.location_coordinates IS NOT NULL
    AND ST_DWithin(
      c.location_coordinates,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
      radius_km * 1000
    )
    AND (crop_type_filter IS NULL OR c.crop_type = crop_type_filter)
    AND (status_filter IS NULL OR c.status = status_filter)
  ORDER BY distance_km
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get location-based analytics
CREATE OR REPLACE FUNCTION get_location_analytics(
  search_lat DECIMAL(10, 8),
  search_lng DECIMAL(11, 8),
  radius_km INTEGER DEFAULT 100
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_contracts', (
      SELECT COUNT(*)
      FROM contracts c
      WHERE c.location_coordinates IS NOT NULL
        AND ST_DWithin(
          c.location_coordinates,
          ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
          radius_km * 1000
        )
    ),
    'active_contracts', (
      SELECT COUNT(*)
      FROM contracts c
      WHERE c.location_coordinates IS NOT NULL
        AND c.status = 'active'
        AND ST_DWithin(
          c.location_coordinates,
          ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
          radius_km * 1000
        )
    ),
    'total_farmers', (
      SELECT COUNT(*)
      FROM profiles p
      WHERE p.location_coordinates IS NOT NULL
        AND p.user_type = 'farmer'
        AND ST_DWithin(
          p.location_coordinates,
          ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
          radius_km * 1000
        )
    ),
    'total_buyers', (
      SELECT COUNT(*)
      FROM profiles p
      WHERE p.location_coordinates IS NOT NULL
        AND p.user_type = 'buyer'
        AND ST_DWithin(
          p.location_coordinates,
          ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
          radius_km * 1000
        )
    ),
    'avg_contract_value', (
      SELECT COALESCE(AVG(quantity * price_per_unit), 0)
      FROM contracts c
      WHERE c.location_coordinates IS NOT NULL
        AND ST_DWithin(
          c.location_coordinates,
          ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
          radius_km * 1000
        )
    ),
    'popular_crops', (
      SELECT json_agg(
        json_build_object(
          'crop_type', crop_type,
          'count', count
        )
      )
      FROM (
        SELECT 
          c.crop_type,
          COUNT(*) as count
        FROM contracts c
        WHERE c.location_coordinates IS NOT NULL
          AND ST_DWithin(
            c.location_coordinates,
            ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
            radius_km * 1000
          )
        GROUP BY c.crop_type
        ORDER BY count DESC
        LIMIT 10
      ) crop_stats
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_contracts_crop_type_status ON contracts(crop_type, status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON contracts(start_date, end_date);

-- Enable RLS (Row Level Security) for location_searches
ALTER TABLE location_searches ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for location_searches
CREATE POLICY "Users can view their own location searches" ON location_searches
  FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON location_searches TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create a helper function to log location searches
CREATE OR REPLACE FUNCTION log_location_search(
  search_type_param TEXT,
  search_lat DECIMAL(10, 8) DEFAULT NULL,
  search_lng DECIMAL(11, 8) DEFAULT NULL,
  search_address_param TEXT DEFAULT NULL,
  search_radius_param INTEGER DEFAULT NULL,
  results_count_param INTEGER DEFAULT 0,
  search_filters_param JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  search_id UUID;
  search_location_point GEOGRAPHY;
BEGIN
  -- Create geography point if coordinates provided
  IF search_lat IS NOT NULL AND search_lng IS NOT NULL THEN
    search_location_point = ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326);
  END IF;

  -- Insert search record
  INSERT INTO location_searches (
    user_id,
    search_type,
    search_location,
    search_address,
    search_radius,
    results_count,
    search_filters
  ) VALUES (
    auth.uid(),
    search_type_param,
    search_location_point,
    search_address_param,
    search_radius_param,
    results_count_param,
    search_filters_param
  ) RETURNING id INTO search_id;

  RETURN search_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE location_searches IS 'Tracks location-based searches for analytics';
COMMENT ON FUNCTION find_nearby_profiles IS 'Find profiles within a specified radius of a location';
COMMENT ON FUNCTION find_nearby_contracts IS 'Find contracts within a specified radius of a location';
COMMENT ON FUNCTION get_location_analytics IS 'Get analytics data for a specific location and radius';
COMMENT ON FUNCTION log_location_search IS 'Log location search for analytics tracking';