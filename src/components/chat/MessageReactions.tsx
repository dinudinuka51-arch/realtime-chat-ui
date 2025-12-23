import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageReaction } from '@/types/chat';
import { cn } from '@/lib/utils';

interface MessageReactionsProps {
  messageId: string;
  isSent: boolean;
}

interface GroupedReaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export const MessageReactions = ({ messageId, isSent }: MessageReactionsProps) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<MessageReaction[]>([]);

  useEffect(() => {
    fetchReactions();

    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId);

    if (data) {
      setReactions(data as MessageReaction[]);
    }
  };

  const toggleReaction = async (emoji: string) => {
    if (!user) return;

    const existingReaction = reactions.find(
      (r) => r.emoji === emoji && r.user_id === user.id
    );

    if (existingReaction) {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
    }
  };

  const groupedReactions: GroupedReaction[] = reactions.reduce((acc, reaction) => {
    const existing = acc.find((r) => r.emoji === reaction.emoji);
    if (existing) {
      existing.count++;
      if (reaction.user_id === user?.id) {
        existing.userReacted = true;
      }
    } else {
      acc.push({
        emoji: reaction.emoji,
        count: 1,
        userReacted: reaction.user_id === user?.id,
      });
    }
    return acc;
  }, [] as GroupedReaction[]);

  if (groupedReactions.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1 mt-1', isSent ? 'justify-end' : 'justify-start')}>
      {groupedReactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => toggleReaction(reaction.emoji)}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors',
            reaction.userReacted
              ? 'bg-primary/20 border border-primary/50'
              : 'bg-secondary/50 border border-transparent hover:border-border'
          )}
        >
          <span>{reaction.emoji}</span>
          <span className="text-muted-foreground">{reaction.count}</span>
        </button>
      ))}
    </div>
  );
};
