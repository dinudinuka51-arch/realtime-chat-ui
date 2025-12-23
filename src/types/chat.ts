export interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  status: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants?: Profile[];
  lastMessage?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  media_url?: string | null;
  media_type?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
  sender?: Profile;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ConversationWithDetails extends Conversation {
  otherUser: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}
