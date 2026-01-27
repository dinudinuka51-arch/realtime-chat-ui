-- Create micro_jobs table for job postings
CREATE TABLE public.micro_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  budget NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create micro_balances table for LKR balances
CREATE TABLE public.micro_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance_lkr NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.micro_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_balances ENABLE ROW LEVEL SECURITY;

-- Micro Jobs Policies - publicly visible
CREATE POLICY "Anyone can view micro jobs"
  ON public.micro_jobs FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own jobs"
  ON public.micro_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
  ON public.micro_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
  ON public.micro_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Micro Balances Policies - publicly visible and updatable
CREATE POLICY "Anyone can view balances"
  ON public.micro_balances FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own balance"
  ON public.micro_balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone authenticated can update balances"
  ON public.micro_balances FOR UPDATE
  USING (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.micro_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.micro_balances;

-- Add trigger for updated_at
CREATE TRIGGER update_micro_jobs_updated_at
  BEFORE UPDATE ON public.micro_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_micro_balances_updated_at
  BEFORE UPDATE ON public.micro_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();