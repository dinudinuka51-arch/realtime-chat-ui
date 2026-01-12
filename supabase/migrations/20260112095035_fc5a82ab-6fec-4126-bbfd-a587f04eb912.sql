-- Create monetization_applications table
CREATE TABLE public.monetization_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  earnings_total NUMERIC DEFAULT 0,
  earnings_pending NUMERIC DEFAULT 0,
  payout_method TEXT,
  payout_details JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monetization_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can view all applications (public)
CREATE POLICY "Anyone can view monetization applications"
ON public.monetization_applications
FOR SELECT
USING (true);

-- Users can apply (insert their own)
CREATE POLICY "Users can apply for monetization"
ON public.monetization_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own application
CREATE POLICY "Users can update own application"
ON public.monetization_applications
FOR UPDATE
USING (auth.uid() = user_id);

-- Add unique constraint on user_id
ALTER TABLE public.monetization_applications ADD CONSTRAINT unique_user_monetization UNIQUE (user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.monetization_applications;