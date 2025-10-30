-- Advanced Search System Setup

-- Enable PostgreSQL full-text search extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Add search vectors to existing tables
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.contract_templates ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create search configuration for contract farming terms
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS farming_search (COPY = english);

-- Function to update contract search vector
CREATE OR REPLACE FUNCTION update_contract_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('farming_search', COALESCE(NEW.title, '')), 'A') ||
                      setweight(to_tsvector('farming_search', COALESCE(NEW.description, '')), 'B') ||
                      setweight(to_tsvector('farming_search', COALESCE(NEW.crop_type, '')), 'A') ||
                      setweight(to_tsvector('farming_search', COALESCE(NEW.location, '')), 'C') ||
                      setweight(to_tsvector('farming_search', COALESCE(NEW.requirements::text, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update profile search vector
CREATE OR REPLACE FUNCTION update_profile_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('farming_search', COALESCE(NEW.full_name, '')), 'A') ||
                      setweight(to_tsvector('farming_search', COALESCE(NEW.company_name, '')), 'A') ||
                      setweight(to_tsvector('farming_search', COALESCE(NEW.bio, '')), 'B') ||
                      setweight(to_tsvector('farming_search', COALESCE(NEW.location, '')), 'C') ||
                      setweight(to_tsvector('farming_search', COALESCE(NEW.specializations::text, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update contract template search vector
CREATE OR REPLACE FUNCTION update_template_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('farming_search', COALESCE(NEW.name, '')), 'A') ||
                      setweight(to_tsvector('farming_search', COALESCE(NEW.description, '')), 'B') ||
                      setweight(to_tsvector('farming_search', COALESCE(NEW.category, '')), 'B') ||
                      setweight(to_tsvector('farming_search', COALESCE(NEW.content::text, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic search vector updates
DROP TRIGGER IF EXISTS contracts_search_vector_update ON public.contracts;
CREATE TRIGGER contracts_search_vector_update
  BEFORE INSERT OR UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION update_contract_search_vector();

DROP TRIGGER IF EXISTS profiles_search_vector_update ON public.profiles;
CREATE TRIGGER profiles_search_vector_update
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_profile_search_vector();

DROP TRIGGER IF EXISTS templates_search_vector_update ON public.contract_templates;
CREATE TRIGGER templates_search_vector_update
  BEFORE INSERT OR UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION update_template_search_vector();

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS idx_contracts_search_vector ON public.contracts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_profiles_search_vector ON public.profiles USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_templates_search_vector ON public.contract_templates USING GIN(search_vector);

-- Create trigram indexes for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_contracts_title_trgm ON public.contracts USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contracts_crop_type_trgm ON public.contracts USING GIN(crop_type gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON public.profiles USING GIN(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_company_trgm ON public.profiles USING GIN(company_name gin_trgm_ops);

-- Create indexes for advanced filtering
CREATE INDEX IF NOT EXISTS idx_contracts_status_created ON public.contracts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_crop_type ON public.contracts(crop_type);
CREATE INDEX IF NOT EXISTS idx_contracts_price_range ON public.contracts(price_per_unit);
CREATE INDEX IF NOT EXISTS idx_contracts_quantity ON public.contracts(quantity);
CREATE INDEX IF NOT EXISTS idx_contracts_location ON public.contracts(location);
CREATE INDEX IF NOT EXISTS idx_contracts_start_date ON public.contracts(start_date);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON public.end_date);

-- Create composite indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_contracts_status_type_date ON public.contracts(status, crop_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_farmer_status ON public.contracts(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_buyer_status ON public.contracts(buyer_id, status) WHERE buyer_id IS NOT NULL;

-- Update existing records to populate search vectors
UPDATE public.contracts SET search_vector = NULL; -- Trigger will populate
UPDATE public.profiles SET search_vector = NULL; -- Trigger will populate
UPDATE public.contract_templates SET search_vector = NULL; -- Trigger will populate

-- Search statistics table for analytics
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  search_query TEXT NOT NULL,
  search_type TEXT NOT NULL CHECK (search_type IN ('contracts', 'profiles', 'templates', 'global')),
  filters_applied JSONB DEFAULT '{}',
  results_count INTEGER NOT NULL DEFAULT 0,
  clicked_result_id UUID,
  clicked_result_type TEXT,
  search_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for search analytics
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for search analytics
CREATE POLICY "Users can view their own search analytics" ON public.search_analytics 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create search analytics" ON public.search_analytics 
  FOR INSERT WITH CHECK (true);

-- Indexes for search analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_date ON public.search_analytics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON public.search_analytics(search_query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_type ON public.search_analytics(search_type);

-- Function for advanced contract search
CREATE OR REPLACE FUNCTION advanced_contract_search(
  search_query TEXT DEFAULT '',
  crop_types TEXT[] DEFAULT NULL,
  min_price DECIMAL DEFAULT NULL,
  max_price DECIMAL DEFAULT NULL,
  min_quantity INTEGER DEFAULT NULL,
  max_quantity INTEGER DEFAULT NULL,
  contract_status TEXT[] DEFAULT NULL,
  location_filter TEXT DEFAULT NULL,
  start_date_from DATE DEFAULT NULL,
  start_date_to DATE DEFAULT NULL,
  farmer_id_filter UUID DEFAULT NULL,
  buyer_id_filter UUID DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  sort_order TEXT DEFAULT 'desc',
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  crop_type TEXT,
  quantity INTEGER,
  price_per_unit DECIMAL,
  status TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  farmer_id UUID,
  buyer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  search_rank REAL,
  farmer_name TEXT,
  farmer_company TEXT,
  buyer_name TEXT,
  buyer_company TEXT
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
    c.start_date,
    c.end_date,
    c.farmer_id,
    c.buyer_id,
    c.created_at,
    CASE 
      WHEN search_query != '' THEN ts_rank(c.search_vector, websearch_to_tsquery('farming_search', search_query))
      ELSE 1.0
    END as search_rank,
    fp.full_name as farmer_name,
    fp.company_name as farmer_company,
    bp.full_name as buyer_name,
    bp.company_name as buyer_company
  FROM public.contracts c
  LEFT JOIN public.profiles fp ON c.farmer_id = fp.id
  LEFT JOIN public.profiles bp ON c.buyer_id = bp.id
  WHERE 
    (search_query = '' OR c.search_vector @@ websearch_to_tsquery('farming_search', search_query))
    AND (crop_types IS NULL OR c.crop_type = ANY(crop_types))
    AND (min_price IS NULL OR c.price_per_unit >= min_price)
    AND (max_price IS NULL OR c.price_per_unit <= max_price)
    AND (min_quantity IS NULL OR c.quantity >= min_quantity)
    AND (max_quantity IS NULL OR c.quantity <= max_quantity)
    AND (contract_status IS NULL OR c.status = ANY(contract_status))
    AND (location_filter IS NULL OR c.location ILIKE '%' || location_filter || '%')
    AND (start_date_from IS NULL OR c.start_date >= start_date_from)
    AND (start_date_to IS NULL OR c.start_date <= start_date_to)
    AND (farmer_id_filter IS NULL OR c.farmer_id = farmer_id_filter)
    AND (buyer_id_filter IS NULL OR c.buyer_id = buyer_id_filter)
  ORDER BY 
    CASE 
      WHEN sort_by = 'relevance' AND search_query != '' THEN search_rank
      WHEN sort_by = 'date' THEN EXTRACT(EPOCH FROM c.created_at)
      WHEN sort_by = 'price' THEN c.price_per_unit
      WHEN sort_by = 'quantity' THEN c.quantity
      ELSE EXTRACT(EPOCH FROM c.created_at)
    END 
    * CASE WHEN sort_order = 'desc' THEN -1 ELSE 1 END
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for profile search
CREATE OR REPLACE FUNCTION search_profiles(
  search_query TEXT DEFAULT '',
  user_types TEXT[] DEFAULT NULL,
  location_filter TEXT DEFAULT NULL,
  has_rating BOOLEAN DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  company_name TEXT,
  user_type TEXT,
  location TEXT,
  bio TEXT,
  avatar_url TEXT,
  search_rank REAL,
  avg_rating DECIMAL,
  total_contracts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.company_name,
    p.user_type,
    p.location,
    p.bio,
    p.avatar_url,
    CASE 
      WHEN search_query != '' THEN ts_rank(p.search_vector, websearch_to_tsquery('farming_search', search_query))
      ELSE 1.0
    END as search_rank,
    rs.average_rating as avg_rating,
    rs.total_contracts_completed as total_contracts
  FROM public.profiles p
  LEFT JOIN public.user_rating_summary rs ON p.id = rs.user_id
  WHERE 
    (search_query = '' OR p.search_vector @@ websearch_to_tsquery('farming_search', search_query))
    AND (user_types IS NULL OR p.user_type = ANY(user_types))
    AND (location_filter IS NULL OR p.location ILIKE '%' || location_filter || '%')
    AND (has_rating IS NULL OR (has_rating = true AND rs.average_rating IS NOT NULL) OR (has_rating = false AND rs.average_rating IS NULL))
  ORDER BY 
    CASE 
      WHEN search_query != '' THEN search_rank
      ELSE EXTRACT(EPOCH FROM p.created_at)
    END DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION advanced_contract_search TO authenticated;
GRANT EXECUTE ON FUNCTION search_profiles TO authenticated;
GRANT SELECT, INSERT ON public.search_analytics TO authenticated;