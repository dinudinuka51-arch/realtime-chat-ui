-- Create stories table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Create story_views table to track who has seen stories
CREATE TABLE public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- Stories policies
CREATE POLICY "Anyone can view non-expired stories"
ON public.stories FOR SELECT
USING (expires_at > now());

CREATE POLICY "Users can create their own stories"
ON public.stories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
ON public.stories FOR DELETE
USING (auth.uid() = user_id);

-- Story views policies
CREATE POLICY "Anyone can view story views"
ON public.story_views FOR SELECT
USING (true);

CREATE POLICY "Users can mark stories as viewed"
ON public.story_views FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

-- Enable realtime for stories
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_views;

-- Create storage bucket for story media
INSERT INTO storage.buckets (id, name, public) VALUES ('stories-media', 'stories-media', true);

-- Storage policies for stories-media bucket
CREATE POLICY "Anyone can view story media"
ON storage.objects FOR SELECT
USING (bucket_id = 'stories-media');

CREATE POLICY "Authenticated users can upload story media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stories-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own story media"
ON storage.objects FOR DELETE
USING (bucket_id = 'stories-media' AND auth.uid()::text = (storage.foldername(name))[1]);