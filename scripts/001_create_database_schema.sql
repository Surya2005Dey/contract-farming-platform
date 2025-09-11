-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('farmer', 'buyer')),
  full_name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  company_name TEXT, -- For buyers
  farm_size DECIMAL, -- For farmers in acres
  specialization TEXT[], -- Crops for farmers, industry for buyers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crop_type TEXT NOT NULL,
  quantity DECIMAL NOT NULL, -- in tons/kg
  price_per_unit DECIMAL NOT NULL,
  total_amount DECIMAL NOT NULL,
  delivery_date DATE NOT NULL,
  quality_standards TEXT,
  payment_terms TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contract bids table
CREATE TABLE IF NOT EXISTS public.contract_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bid_amount DECIMAL NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table for communication
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for contracts
CREATE POLICY "Users can view contracts they're involved in" ON public.contracts 
  FOR SELECT USING (auth.uid() = farmer_id OR auth.uid() = buyer_id);
CREATE POLICY "Farmers can create contracts" ON public.contracts 
  FOR INSERT WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "Contract parties can update" ON public.contracts 
  FOR UPDATE USING (auth.uid() = farmer_id OR auth.uid() = buyer_id);

-- RLS Policies for contract bids
CREATE POLICY "Users can view bids on their contracts" ON public.contract_bids 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = contract_bids.contract_id 
      AND (contracts.farmer_id = auth.uid() OR contracts.buyer_id = auth.uid())
    ) OR auth.uid() = bidder_id
  );
CREATE POLICY "Users can create bids" ON public.contract_bids 
  FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- RLS Policies for payments
CREATE POLICY "Users can view their payments" ON public.payments 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = payments.contract_id 
      AND (contracts.farmer_id = auth.uid() OR contracts.buyer_id = auth.uid())
    )
  );
CREATE POLICY "Users can create payments" ON public.payments 
  FOR INSERT WITH CHECK (auth.uid() = payer_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages on their contracts" ON public.messages 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = messages.contract_id 
      AND (contracts.farmer_id = auth.uid() OR contracts.buyer_id = auth.uid())
    )
  );
CREATE POLICY "Users can send messages" ON public.messages 
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
