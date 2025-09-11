-- Adding contract templates, signatures, and negotiation tables
-- Create contract templates table
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_fields JSONB NOT NULL, -- Dynamic fields configuration
  created_by UUID REFERENCES public.profiles(id),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contract drafts table for negotiation
CREATE TABLE IF NOT EXISTS public.contract_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.contract_templates(id),
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  contract_data JSONB NOT NULL, -- All contract field values
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent_for_review', 'under_negotiation', 'ready_to_sign', 'signed', 'cancelled')),
  current_version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contract negotiations table for comments and changes
CREATE TABLE IF NOT EXISTS public.contract_negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES public.contract_drafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment TEXT,
  proposed_changes JSONB, -- Field changes proposed
  version INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create digital signatures table
CREATE TABLE IF NOT EXISTS public.contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES public.contract_drafts(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL, -- Base64 encoded signature
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS for new tables
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract templates
CREATE POLICY "Everyone can view templates" ON public.contract_templates FOR SELECT USING (true);
CREATE POLICY "Users can create templates" ON public.contract_templates FOR INSERT WITH CHECK (auth.uid() = created_by);

-- RLS Policies for contract drafts
CREATE POLICY "Contract parties can view drafts" ON public.contract_drafts 
  FOR SELECT USING (auth.uid() = farmer_id OR auth.uid() = buyer_id);
CREATE POLICY "Contract parties can update drafts" ON public.contract_drafts 
  FOR UPDATE USING (auth.uid() = farmer_id OR auth.uid() = buyer_id);
CREATE POLICY "Farmers can create drafts" ON public.contract_drafts 
  FOR INSERT WITH CHECK (auth.uid() = farmer_id);

-- RLS Policies for negotiations
CREATE POLICY "Contract parties can view negotiations" ON public.contract_negotiations 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contract_drafts 
      WHERE contract_drafts.id = contract_negotiations.draft_id 
      AND (contract_drafts.farmer_id = auth.uid() OR contract_drafts.buyer_id = auth.uid())
    )
  );
CREATE POLICY "Contract parties can add negotiations" ON public.contract_negotiations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for signatures
CREATE POLICY "Contract parties can view signatures" ON public.contract_signatures 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contract_drafts 
      WHERE contract_drafts.id = contract_signatures.draft_id 
      AND (contract_drafts.farmer_id = auth.uid() OR contract_drafts.buyer_id = auth.uid())
    )
  );
CREATE POLICY "Users can create their own signatures" ON public.contract_signatures 
  FOR INSERT WITH CHECK (auth.uid() = signer_id);

-- Insert default contract templates
INSERT INTO public.contract_templates (name, description, template_fields, is_default) VALUES
('Standard Crop Purchase Agreement', 'Basic template for crop purchase contracts', 
 '{
   "crop_type": {"type": "select", "label": "Crop Type", "required": true, "options": ["Rice", "Wheat", "Corn", "Soybeans", "Cotton", "Sugarcane", "Other"]},
   "quantity": {"type": "number", "label": "Quantity (tons)", "required": true, "min": 0.1},
   "price_per_unit": {"type": "number", "label": "Price per Ton ($)", "required": true, "min": 0},
   "delivery_date": {"type": "date", "label": "Delivery Date", "required": true},
   "quality_standards": {"type": "textarea", "label": "Quality Standards", "required": true},
   "payment_terms": {"type": "select", "label": "Payment Terms", "required": true, "options": ["Payment on delivery", "30 days after delivery", "50% advance, 50% on delivery"]},
   "delivery_location": {"type": "text", "label": "Delivery Location", "required": true},
   "penalties": {"type": "textarea", "label": "Penalties for Non-compliance", "required": false}
 }', true),
('Seasonal Contract Agreement', 'Template for seasonal crop contracts with multiple deliveries', 
 '{
   "crop_type": {"type": "select", "label": "Crop Type", "required": true, "options": ["Rice", "Wheat", "Corn", "Soybeans", "Cotton", "Sugarcane", "Other"]},
   "total_quantity": {"type": "number", "label": "Total Quantity (tons)", "required": true, "min": 0.1},
   "delivery_schedule": {"type": "textarea", "label": "Delivery Schedule", "required": true},
   "price_per_unit": {"type": "number", "label": "Price per Ton ($)", "required": true, "min": 0},
   "season_duration": {"type": "text", "label": "Season Duration", "required": true},
   "quality_standards": {"type": "textarea", "label": "Quality Standards", "required": true},
   "payment_terms": {"type": "select", "label": "Payment Terms", "required": true, "options": ["Payment on each delivery", "Monthly payments", "End of season payment"]},
   "force_majeure": {"type": "textarea", "label": "Force Majeure Clause", "required": false}
 }', true);
