-- Adding comprehensive payment and escrow system
-- Enhanced payment system with escrow functionality
CREATE TABLE IF NOT EXISTS public.escrow_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_amount DECIMAL NOT NULL,
  platform_commission_rate DECIMAL DEFAULT 0.05, -- 5% commission
  platform_commission DECIMAL NOT NULL,
  farmer_amount DECIMAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'funded', 'released', 'disputed', 'refunded')),
  funded_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions for detailed tracking
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES public.escrow_accounts(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'release', 'refund', 'commission')),
  amount DECIMAL NOT NULL,
  payment_method TEXT NOT NULL,
  payment_gateway_id TEXT, -- External payment gateway transaction ID
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  failure_reason TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery verification system
CREATE TABLE IF NOT EXISTS public.delivery_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  verified_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('buyer_confirmation', 'quality_check', 'quantity_check')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  images TEXT[], -- URLs to verification images
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform wallet for commission tracking
CREATE TABLE IF NOT EXISTS public.platform_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('commission', 'refund', 'withdrawal')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE public.escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_wallet ENABLE ROW LEVEL SECURITY;

-- RLS Policies for escrow accounts
CREATE POLICY "Users can view their escrow accounts" ON public.escrow_accounts 
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = farmer_id);

-- RLS Policies for payment transactions
CREATE POLICY "Users can view their payment transactions" ON public.payment_transactions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.escrow_accounts 
      WHERE escrow_accounts.id = payment_transactions.escrow_id 
      AND (escrow_accounts.buyer_id = auth.uid() OR escrow_accounts.farmer_id = auth.uid())
    )
  );

-- RLS Policies for delivery verifications
CREATE POLICY "Contract parties can view delivery verifications" ON public.delivery_verifications 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = delivery_verifications.contract_id 
      AND (contracts.farmer_id = auth.uid() OR contracts.buyer_id = auth.uid())
    )
  );
CREATE POLICY "Contract parties can create delivery verifications" ON public.delivery_verifications 
  FOR INSERT WITH CHECK (auth.uid() = verified_by);

-- Update existing payments table to link with escrow
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS escrow_id UUID REFERENCES public.escrow_accounts(id);
