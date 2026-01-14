-- Allow any authenticated user to approve listings (update status only)
-- This is for the password-protected approval feature
CREATE POLICY "Authenticated users can approve listings" 
ON public.marketplace_listings 
FOR UPDATE 
TO authenticated
USING (status = 'pending')
WITH CHECK (status = 'approved');