-- Drop the existing delete policy
DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON public.messages;

-- Create new policy: Only sender can delete their own messages
CREATE POLICY "Only sender can delete their own messages" 
ON public.messages 
FOR DELETE 
USING (sender_id = auth.uid());