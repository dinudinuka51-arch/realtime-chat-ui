-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'Hey there! I am using Roman.',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation participants table
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by all authenticated users" 
ON public.profiles FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Users can view conversations they are part of" 
ON public.conversations FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations" 
ON public.conversations FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Conversation participants policies
CREATE POLICY "Users can view participants of their conversations" 
ON public.conversation_participants FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp 
    WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add participants to conversations" 
ON public.conversation_participants FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their conversations" 
ON public.messages FOR INSERT 
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.messages FOR UPDATE 
TO authenticated
USING (sender_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Enable realtime for profiles (for online status)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Roman User')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();