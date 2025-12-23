-- Create storage bucket for chat media (photos/videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-media bucket
CREATE POLICY "Users can upload chat media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view chat media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

CREATE POLICY "Users can delete their own chat media"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for avatars bucket
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add media_url column to messages table for photo/video
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Add DELETE policy for messages (delete for everyone)
CREATE POLICY "Users can delete messages in their conversations"
ON public.messages
FOR DELETE
USING (is_conversation_participant(conversation_id, auth.uid()));

-- Create typing_indicators table for realtime typing status
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on typing_indicators
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS policies for typing_indicators
CREATE POLICY "Users can view typing status in their conversations"
ON public.typing_indicators FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can update their own typing status"
ON public.typing_indicators FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can update typing status"
ON public.typing_indicators FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their typing status"
ON public.typing_indicators FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for typing_indicators
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;