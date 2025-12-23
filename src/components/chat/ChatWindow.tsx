import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Message, Profile } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, isToday, isYesterday } from 'date-fns';
import { Send, ArrowLeft, MoreVertical, Phone, Video } from 'lucide-react';

interface ChatWindowProps {
  conversationId: string;
  onBack?: () => void;
}

export const ChatWindow = ({ conversationId, onBack }: ChatWindowProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data as Message[]);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user?.id);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherUser = async () => {
    if (!user) return;

    try {
      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .single();

      if (participant) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', participant.user_id)
          .single();

        if (profile) {
          setOtherUser(profile as Profile);
        }
      }
    } catch (error) {
      console.error('Error fetching other user:', error);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchOtherUser();
  }, [conversationId]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          
          // Mark as read if from other user
          if (newMsg.sender_id !== user?.id) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent,
      });

      if (error) throw error;
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'HH:mm');
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const shouldShowDateHeader = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].created_at).toDateString();
    const prevDate = new Date(messages[index - 1].created_at).toDateString();
    return currentDate !== prevDate;
  };

  const getInitials = (name: string | null, username: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  if (!otherUser) {
    return (
      <div className="h-full flex items-center justify-center bg-chat-bg">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-chat-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border shadow-sm">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={otherUser.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(otherUser.full_name, otherUser.username)}
            </AvatarFallback>
          </Avatar>
          {otherUser.is_online && (
            <span className="absolute bottom-0 right-0 online-indicator" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground truncate">
            {otherUser.full_name || otherUser.username}
          </h2>
          <p className="text-xs text-muted-foreground">
            {otherUser.is_online ? 'Online' : 'Offline'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 chat-pattern" ref={scrollRef}>
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No messages yet. Say hello! 👋
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isSent = message.sender_id === user?.id;
              const showDateHeader = shouldShowDateHeader(index);

              return (
                <div key={message.id}>
                  {showDateHeader && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 text-xs bg-secondary rounded-full text-muted-foreground">
                        {formatDateHeader(message.created_at)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-message-in`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2.5 ${
                        isSent ? 'message-bubble-sent' : 'message-bubble-received'
                      }`}
                    >
                      <p className="text-[15px] leading-relaxed break-words">
                        {message.content}
                      </p>
                      <div
                        className={`flex items-center gap-1 mt-1 ${
                          isSent ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span
                          className={`text-[10px] ${
                            isSent
                              ? 'text-message-sent-foreground/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {formatMessageTime(message.created_at)}
                        </span>
                        {isSent && (
                          <span
                            className={`text-[10px] ${
                              message.is_read
                                ? 'text-message-sent-foreground'
                                : 'text-message-sent-foreground/50'
                            }`}
                          >
                            {message.is_read ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-card border-t border-border">
        <form onSubmit={sendMessage} className="flex items-center gap-3">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-12 rounded-xl bg-secondary/50 border-0"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            className="w-12 h-12 rounded-xl"
            disabled={!newMessage.trim() || sending}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};
