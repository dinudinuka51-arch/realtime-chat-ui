-- Create marketplace storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace', 'marketplace', true);

-- Allow authenticated users to upload to marketplace bucket
CREATE POLICY "Users can upload to marketplace"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'marketplace' AND auth.uid() IS NOT NULL);

-- Allow public to view marketplace images
CREATE POLICY "Public can view marketplace images"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketplace');

-- Allow users to update their own marketplace images
CREATE POLICY "Users can update their marketplace images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'marketplace' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own marketplace images
CREATE POLICY "Users can delete their marketplace images"
ON storage.objects FOR DELETE
USING (bucket_id = 'marketplace' AND auth.uid()::text = (storage.foldername(name))[1]);