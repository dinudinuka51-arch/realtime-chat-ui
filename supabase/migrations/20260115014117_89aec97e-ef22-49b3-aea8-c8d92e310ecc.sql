-- Drop the existing SELECT policy that only shows own pending listings
DROP POLICY IF EXISTS "Anyone can view approved listings" ON public.marketplace_listings;

-- Create new policy that allows viewing all pending listings for any authenticated user
CREATE POLICY "Anyone can view approved or pending listings" 
ON public.marketplace_listings 
FOR SELECT 
USING (
  (status = 'approved') OR 
  (status = 'pending') OR 
  (user_id = auth.uid())
);