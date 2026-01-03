import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { ConversationListSkeleton } from '@/components/ui/skeleton-loaders';

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

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Single optimized query to get all conversation data
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

      // Batch fetch: Get all other participants at once
      const { data: allParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds)
        .neq('user_id', user.id);

      if (!allParticipants || allParticipants.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get all unique user IDs
      const userIds = [...new Set(allParticipants.map(p => p.user_id))];

      // Batch fetch: Get all profiles at once
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      // Batch fetch: Get latest messages for all conversations
      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      // Batch fetch: Get unread counts
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      // Build conversation map
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const participantMap = new Map(allParticipants.map(p => [p.conversation_id, p.user_id]));
      
      // Group messages by conversation and get latest
      const latestMessageMap = new Map<string, any>();
      allMessages?.forEach(msg => {
        if (!latestMessageMap.has(msg.conversation_id)) {
          latestMessageMap.set(msg.conversation_id, msg);
        }
      });

      // Count unreads per conversation
      const unreadCountMap = new Map<string, number>();
      unreadMessages?.forEach(msg => {
        unreadCountMap.set(msg.conversation_id, (unreadCountMap.get(msg.conversation_id) || 0) + 1);
      });

      // Build final conversations array
      const conversationsWithDetails: ConversationWithDetails[] = conversationIds
        .map(convId => {
          const otherUserId = participantMap.get(convId);
          const profile = otherUserId ? profileMap.get(otherUserId) : null;
          
          if (!profile) return null;

          return {
            id: convId,
            created_at: '',
            updated_at: '',
            otherUser: profile as Profile,
            lastMessage: latestMessageMap.get(convId) as Message | null,
            unreadCount: unreadCountMap.get(convId) || 0,
          };
        })
        .filter((c): c is ConversationWithDetails => c !== null);

      // Sort by last message time
      conversationsWithDetails.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || '';
        const bTime = b.lastMessage?.created_at || '';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to message changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  const filteredConversations = useMemo(() => 
    conversations.filter(conv =>
      conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.otherUser.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [conversations, searchQuery]
  );

  const getInitials = useCallback((name: string | null, username: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  }, []);

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
            <ConversationListSkeleton />
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
