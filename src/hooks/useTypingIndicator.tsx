import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useTypingIndicator = (conversationId: string) => {
  const { user } = useAuth();
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingRef = useRef<number>(0);

  // Update typing status
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!user || !conversationId) return;

    // Throttle typing updates to once per second
    const now = Date.now();
    if (isTyping && now - lastTypingRef.current < 1000) return;
    lastTypingRef.current = now;

    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'conversation_id,user_id' });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [user, conversationId]);

  // Auto-stop typing after 3 seconds of inactivity
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  // Subscribe to typing indicator changes
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const data = payload.new;
          if (data && data.user_id !== user.id) {
            setIsOtherUserTyping(data.is_typing);
            
            // Auto-reset after 4 seconds (in case user disconnects)
            if (data.is_typing) {
              setTimeout(() => {
                setIsOtherUserTyping(false);
              }, 4000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTyping(false);
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, setTyping]);

  return {
    isOtherUserTyping,
    handleTyping,
    stopTyping: () => setTyping(false),
  };
};
