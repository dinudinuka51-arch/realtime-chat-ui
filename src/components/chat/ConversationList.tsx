import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ConversationWithDetails, Profile, Message } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Search, MessageSquarePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NewChatDialog } from './NewChatDialog';

interface ConversationListProps {
  selectedConversation: string | null;
  onSelectConversation: (id: string) => void;
}

export const ConversationList = ({
  selectedConversation,
  onSelectConversation,
}: ConversationListProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      // Get all conversations where user is a participant
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (partError) throw partError;

      if (!participations || participations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participations.map(p => p.conversation_id);

      // Get conversation details with other participants
      const conversationsWithDetails: ConversationWithDetails[] = [];

      for (const convId of conversationIds) {
        // Get other participant
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', convId)
          .neq('user_id', user.id)
          .single();

        if (otherParticipant) {
          // Get their profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', otherParticipant.user_id)
            .single();

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convId)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          if (profile) {
            conversationsWithDetails.push({
              id: convId,
              created_at: '',
              updated_at: '',
              otherUser: profile as Profile,
              lastMessage: lastMessage as Message | null,
              unreadCount: unreadCount || 0,
            });
          }
        }
      }

      // Sort by last message time
      conversationsWithDetails.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.created_at;
        const bTime = b.lastMessage?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  // Subscribe to message changes (new messages and read status updates)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => {
          // Update when messages are read
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string | null, username: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <div className="h-full flex flex-col bg-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-sidebar-foreground">Chats</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNewChat(true)}
            className="text-primary hover:bg-accent"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary/50 border-0 rounded-xl h-10"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquarePlus className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'No conversations found' : 'Start a new conversation'}
              </p>
              {!searchQuery && (
                <Button
                  variant="link"
                  onClick={() => setShowNewChat(true)}
                  className="mt-2 text-primary"
                >
                  New Chat
                </Button>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                  selectedConversation === conv.id
                    ? 'bg-accent'
                    : 'hover:bg-secondary/50'
                }`}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={conv.otherUser.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(conv.otherUser.full_name, conv.otherUser.username)}
                    </AvatarFallback>
                  </Avatar>
                  {conv.otherUser.is_online && (
                    <span className="absolute bottom-0 right-0 online-indicator animate-pulse-online" />
                  )}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sidebar-foreground truncate">
                      {conv.otherUser.full_name || conv.otherUser.username}
                    </span>
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                          addSuffix: false,
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage?.content || 'No messages yet'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 min-w-[20px] h-5 flex items-center justify-center bg-primary text-primary-foreground text-xs font-semibold rounded-full px-1.5">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <NewChatDialog
        open={showNewChat}
        onOpenChange={setShowNewChat}
        onConversationCreated={(convId) => {
          fetchConversations();
          onSelectConversation(convId);
        }}
      />
    </div>
  );
};
