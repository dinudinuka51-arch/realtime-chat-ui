import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useVoiceCallContext } from '@/contexts/VoiceCallContext';
import { Message, Profile } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, isToday, isYesterday } from 'date-fns';
import { Send, ArrowLeft, MoreVertical, Phone, Video, RefreshCw, AlertTriangle, Copy, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { MediaUpload } from './MediaUpload';
import { VoiceRecorder } from './VoiceRecorder';

interface ChatWindowProps {
  conversationId: string;
  onBack?: () => void;
}

export const ChatWindow = ({ conversationId, onBack }: ChatWindowProps) => {
  const { user, loading: authLoading } = useAuth();
  const isOnline = useOnlineStatus();
  const { isOtherUserTyping, handleTyping, stopTyping } = useTypingIndicator(conversationId);
  const { startCall } = useVoiceCallContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = async () => {
    try {
      const { data, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;
      setMessages(data as Message[]);

      // Mark messages as read with timestamp
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user?.id);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(`Messages: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherUser = async (retryCount = 0) => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      const { data: participant, error: partError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .maybeSingle();

      if (partError) throw partError;

      if (!participant) {
        setError(`No other participant found for conversation: ${conversationId}`);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', participant.user_id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        setError(`Profile not found for user: ${participant.user_id}`);
        setLoading(false);
        return;
      }

      setOtherUser(profile as Profile);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching other user:', err);
      
      if (err?.message?.includes('Failed to fetch') && retryCount < 3) {
        setTimeout(() => fetchOtherUser(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      const errorMsg = err?.message || JSON.stringify(err);
      setError(`Network error: ${errorMsg}\n\nConversation ID: ${conversationId}\nPlease check your internet connection and try again.`);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError('User not authenticated. Please log in again.');
      setLoading(false);
      return;
    }
    fetchMessages();
    fetchOtherUser();
  }, [conversationId, authLoading, user]);

  // Real-time subscription for new messages and deletions
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
          
          if (newMsg.sender_id !== user?.id) {
            supabase
              .from('messages')
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq('id', newMsg.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
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
  }, [messages, isOtherUserTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    stopTyping();
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent,
      });

      if (error) throw error;
      toast.success('Message sent');
      inputRef.current?.focus();
    } catch (error: any) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast.success('Message deleted for everyone');
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
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

  const copyError = async () => {
    if (error) {
      await navigator.clipboard.writeText(error);
      toast.success('Error copied to clipboard');
    }
  };

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    setError(null);
    setLoading(true);
    
    await Promise.all([fetchMessages(), fetchOtherUser()]);
    setRetrying(false);
  }, [conversationId, user]);

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-chat-bg p-6">
        <div className="max-w-md w-full glass rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
              {!isOnline ? (
                <WifiOff className="w-6 h-6 text-destructive" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {!isOnline ? 'No Connection' : 'Error Loading Chat'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {!isOnline ? 'Check your internet connection' : 'Something went wrong'}
              </p>
            </div>
          </div>
          
          <pre className="text-xs text-muted-foreground bg-secondary/50 p-4 rounded-xl overflow-auto max-h-32 whitespace-pre-wrap break-all select-all mb-4 border border-border">
            {error}
          </pre>
          
          <div className="flex gap-3">
            <Button
              variant="default"
              onClick={handleRetry}
              disabled={retrying}
              className="flex-1 gap-2 h-11 rounded-xl bg-primary hover:bg-primary/90 transition-all duration-300"
            >
              <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying...' : 'Retry'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={copyError}
              className="h-11 w-11 rounded-xl border-border hover:bg-secondary"
            >
              <Copy className="w-4 h-4" />
            </Button>
            {onBack && (
              <Button 
                variant="outline" 
                onClick={onBack}
                className="h-11 rounded-xl border-border hover:bg-secondary"
              >
                Go Back
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="h-full flex items-center justify-center bg-chat-bg">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-glow">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
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
            {isOtherUserTyping ? 'Typing...' : otherUser.is_online ? 'Online' : 'Offline'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => startCall(conversationId, otherUser.user_id)}
          >
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
                  <MessageBubble
                    message={message}
                    isSent={isSent}
                    onDelete={deleteMessage}
                  />
                </div>
              );
            })
          )}
          
          {/* Typing Indicator */}
          {isOtherUserTyping && (
            <TypingIndicator username={otherUser.full_name || otherUser.username} />
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-2 sm:p-4 bg-card border-t border-border">
        <form onSubmit={sendMessage} className="flex items-center gap-1 sm:gap-2">
          <div className="flex flex-col gap-1">
            <VoiceRecorder 
              conversationId={conversationId} 
              onVoiceSent={() => {}} 
            />
            <MediaUpload 
              conversationId={conversationId} 
              onMediaSent={() => {}} 
            />
          </div>
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 min-w-0 h-10 sm:h-12 rounded-xl bg-secondary/50 border-0 text-sm sm:text-base"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0"
            disabled={!newMessage.trim() || sending}
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};
