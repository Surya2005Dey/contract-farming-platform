-- Create ratings and reviews tables
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  category TEXT NOT NULL CHECK (category IN ('communication', 'quality', 'timeliness', 'overall')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contract_id, reviewer_id, reviewee_id, category)
);

-- Create review summary view for quick access to average ratings
CREATE OR REPLACE VIEW public.user_rating_summary AS
SELECT 
  reviewee_id as user_id,
  ROUND(AVG(rating), 2) as average_rating,
  COUNT(*) as total_reviews,
  COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
  COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
  COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
  COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count
FROM public.ratings 
WHERE category = 'overall'
GROUP BY reviewee_id;

-- Enable Row Level Security
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ratings
CREATE POLICY "Users can view all ratings" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Users can create ratings for their contracts" ON public.ratings 
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = ratings.contract_id 
      AND contracts.status = 'completed'
      AND (contracts.farmer_id = auth.uid() OR contracts.buyer_id = auth.uid())
    )
  );
CREATE POLICY "Users can update their own ratings" ON public.ratings 
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ratings_reviewee_id ON public.ratings(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_ratings_contract_id ON public.ratings(contract_id);
CREATE INDEX IF NOT EXISTS idx_ratings_category ON public.ratings(category);
