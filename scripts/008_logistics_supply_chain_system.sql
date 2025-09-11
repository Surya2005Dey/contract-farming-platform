-- Adding comprehensive logistics and supply chain management tables

-- Create logistics providers table
CREATE TABLE IF NOT EXISTS public.logistics_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('shipping', 'warehouse', 'cold_storage')),
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  service_areas TEXT[], -- Geographic areas they serve
  capabilities TEXT[], -- refrigerated, bulk, express, etc.
  base_rate DECIMAL NOT NULL, -- Base rate per kg/km
  rating DECIMAL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shipping quotes table
CREATE TABLE IF NOT EXISTS public.shipping_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.logistics_providers(id) ON DELETE CASCADE,
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  weight DECIMAL NOT NULL, -- in kg
  volume DECIMAL, -- in cubic meters
  service_type TEXT NOT NULL CHECK (service_type IN ('standard', 'express', 'refrigerated', 'bulk')),
  estimated_cost DECIMAL NOT NULL,
  estimated_delivery_days INTEGER NOT NULL,
  quote_valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES public.shipping_quotes(id) ON DELETE CASCADE,
  tracking_number TEXT UNIQUE NOT NULL,
  pickup_date DATE,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
  current_location TEXT,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create warehouse bookings table
CREATE TABLE IF NOT EXISTS public.warehouse_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.logistics_providers(id) ON DELETE CASCADE,
  storage_type TEXT NOT NULL CHECK (storage_type IN ('ambient', 'refrigerated', 'frozen')),
  quantity DECIMAL NOT NULL, -- in tons
  start_date DATE NOT NULL,
  end_date DATE,
  daily_rate DECIMAL NOT NULL,
  total_cost DECIMAL,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shipment tracking events table
CREATE TABLE IF NOT EXISTS public.shipment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample logistics providers
INSERT INTO public.logistics_providers (name, type, contact_email, contact_phone, service_areas, capabilities, base_rate, rating) VALUES
('FastShip Logistics', 'shipping', 'contact@fastship.com', '+1-555-0101', ARRAY['North America', 'Europe'], ARRAY['standard', 'express', 'refrigerated'], 2.50, 4.5),
('ColdChain Express', 'shipping', 'info@coldchain.com', '+1-555-0102', ARRAY['Global'], ARRAY['refrigerated', 'frozen'], 3.75, 4.8),
('AgriStore Warehouses', 'warehouse', 'bookings@agristore.com', '+1-555-0103', ARRAY['Midwest', 'South'], ARRAY['ambient', 'refrigerated'], 1.25, 4.2),
('FreshKeep Storage', 'cold_storage', 'reserve@freshkeep.com', '+1-555-0104', ARRAY['California', 'Texas'], ARRAY['refrigerated', 'frozen'], 2.00, 4.6),
('BulkMove Transport', 'shipping', 'dispatch@bulkmove.com', '+1-555-0105', ARRAY['Continental US'], ARRAY['bulk', 'standard'], 1.80, 4.1);

-- Enable Row Level Security
ALTER TABLE public.logistics_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for logistics providers (public read)
CREATE POLICY "Anyone can view logistics providers" ON public.logistics_providers FOR SELECT USING (true);

-- RLS Policies for shipping quotes
CREATE POLICY "Users can view quotes for their contracts" ON public.shipping_quotes 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = shipping_quotes.contract_id 
      AND (contracts.farmer_id = auth.uid() OR contracts.buyer_id = auth.uid())
    )
  );
CREATE POLICY "Users can create quotes for their contracts" ON public.shipping_quotes 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = contract_id 
      AND (contracts.farmer_id = auth.uid() OR contracts.buyer_id = auth.uid())
    )
  );

-- RLS Policies for shipments
CREATE POLICY "Users can view shipments for their contracts" ON public.shipments 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = shipments.contract_id 
      AND (contracts.farmer_id = auth.uid() OR contracts.buyer_id = auth.uid())
    )
  );
CREATE POLICY "Users can create shipments for their contracts" ON public.shipments 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = contract_id 
      AND (contracts.farmer_id = auth.uid() OR contracts.buyer_id = auth.uid())
    )
  );

-- RLS Policies for warehouse bookings
CREATE POLICY "Users can view warehouse bookings for their contracts" ON public.warehouse_bookings 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = warehouse_bookings.contract_id 
      AND (contracts.farmer_id = auth.uid() OR contracts.buyer_id = auth.uid())
    )
  );
CREATE POLICY "Users can create warehouse bookings for their contracts" ON public.warehouse_bookings 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = contract_id 
      AND (contracts.farmer_id = auth.uid() OR contracts.buyer_id = auth.uid())
    )
  );

-- RLS Policies for shipment tracking
CREATE POLICY "Users can view tracking for their shipments" ON public.shipment_tracking 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      JOIN public.contracts c ON c.id = s.contract_id
      WHERE s.id = shipment_tracking.shipment_id 
      AND (c.farmer_id = auth.uid() OR c.buyer_id = auth.uid())
    )
  );
