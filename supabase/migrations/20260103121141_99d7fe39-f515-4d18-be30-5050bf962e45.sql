-- Create story_highlights table for permanent story saves
CREATE TABLE public.story_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Highlight',
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for stories in highlights
CREATE TABLE public.highlight_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  highlight_id UUID NOT NULL REFERENCES public.story_highlights(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(highlight_id, story_id)
);

-- Enable RLS
ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_stories ENABLE ROW LEVEL SECURITY;

-- RLS policies for story_highlights
CREATE POLICY "Anyone can view highlights"
ON public.story_highlights FOR SELECT
USING (true);

CREATE POLICY "Users can create their own highlights"
ON public.story_highlights FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own highlights"
ON public.story_highlights FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights"
ON public.story_highlights FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for highlight_stories
CREATE POLICY "Anyone can view highlight stories"
ON public.highlight_stories FOR SELECT
USING (true);

CREATE POLICY "Users can add stories to their highlights"
ON public.highlight_stories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.story_highlights h
    WHERE h.id = highlight_id AND h.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove stories from their highlights"
ON public.highlight_stories FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.story_highlights h
    WHERE h.id = highlight_id AND h.user_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_highlights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.highlight_stories;

-- Add updated_at trigger
CREATE TRIGGER update_story_highlights_updated_at
BEFORE UPDATE ON public.story_highlights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();