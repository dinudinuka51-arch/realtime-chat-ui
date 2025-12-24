-- Create voice_calls table for call signaling
CREATE TABLE public.voice_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'calling', -- calling, accepted, rejected, ended, missed
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create call_signals table for WebRTC signaling
CREATE TABLE public.call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.voice_calls(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  signal_type TEXT NOT NULL, -- offer, answer, ice-candidate
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice_calls
CREATE POLICY "Users can view their calls"
  ON public.voice_calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create calls"
  ON public.voice_calls FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their calls"
  ON public.voice_calls FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- RLS policies for call_signals
CREATE POLICY "Users can view their signals"
  ON public.call_signals FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create signals"
  ON public.call_signals FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;