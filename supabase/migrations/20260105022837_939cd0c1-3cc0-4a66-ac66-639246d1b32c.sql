-- Create marketplace listings table
CREATE TABLE public.marketplace_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  images TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view approved listings"
ON public.marketplace_listings
FOR SELECT
USING (status = 'approved' OR user_id = auth.uid());

CREATE POLICY "Users can create listings"
ON public.marketplace_listings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
ON public.marketplace_listings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
ON public.marketplace_listings
FOR DELETE
USING (auth.uid() = user_id);

-- Admin can manage all listings
CREATE POLICY "Admins can manage all listings"
ON public.marketplace_listings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid()
));

-- Create marketplace orders table for monetization
CREATE TABLE public.marketplace_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY "Users can view their orders"
ON public.marketplace_orders
FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create orders"
ON public.marketplace_orders
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins can view all orders"
ON public.marketplace_orders
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid()
));

-- Create platform_settings for monetization config
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view settings"
ON public.platform_settings
FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can manage settings"
ON public.platform_settings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM admin_roles ar WHERE ar.user_id = auth.uid()
));

-- Insert default platform settings
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES 
  ('platform_fee_percentage', '{"value": 10}'::jsonb),
  ('admin_password_hash', '{"hash": "240be518fabd2724ddb6f04eeb9d5b0a"}'::jsonb);

-- Create updated_at triggers
CREATE TRIGGER update_marketplace_listings_updated_at
BEFORE UPDATE ON public.marketplace_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_orders_updated_at
BEFORE UPDATE ON public.marketplace_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_orders;