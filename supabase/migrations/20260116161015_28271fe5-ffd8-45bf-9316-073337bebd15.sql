-- Create seller_ratings table for ratings & reviews
CREATE TABLE public.seller_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  rater_id UUID NOT NULL,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rater_id, listing_id)
);

ALTER TABLE public.seller_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings" 
ON public.seller_ratings FOR SELECT USING (true);

CREATE POLICY "Users can create ratings" 
ON public.seller_ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Users can update own ratings" 
ON public.seller_ratings FOR UPDATE USING (auth.uid() = rater_id);

CREATE POLICY "Users can delete own ratings" 
ON public.seller_ratings FOR DELETE USING (auth.uid() = rater_id);

-- Create wishlist/favorites table
CREATE TABLE public.listing_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

ALTER TABLE public.listing_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites" 
ON public.listing_favorites FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites" 
ON public.listing_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites" 
ON public.listing_favorites FOR DELETE USING (auth.uid() = user_id);

-- Create listing_reports table
CREATE TABLE public.listing_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" 
ON public.listing_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" 
ON public.listing_reports FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" 
ON public.listing_reports FOR SELECT 
USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update reports" 
ON public.listing_reports FOR UPDATE 
USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));

-- Add location and expiry columns to marketplace_listings
ALTER TABLE public.marketplace_listings 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days');

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_reports;