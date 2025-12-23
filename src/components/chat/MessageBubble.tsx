import { useState } from 'react';
import { Message } from '@/types/chat';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmojiPicker } from './EmojiPicker';
import { MessageReactions } from './MessageReactions';
import { ReadReceipt } from './ReadReceipt';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  onDelete: (messageId: string) => void;
}

export const MessageBubble = ({ message, isSent, onDelete }: MessageBubbleProps) => {
  const { user } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const formatMessageTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm');
  };

  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      setShowDeleteDialog(true);
    }, 500);
    setPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowDeleteDialog(true);
  };

  const handleAddReaction = async (emoji: string) => {
    if (!user) return;

    await supabase.from('message_reactions').insert({
      message_id: message.id,
      user_id: user.id,
      emoji,
    });
  };

  const renderMediaContent = () => {
    if (!message.media_url) return null;

    if (message.media_type === 'image') {
      return (
        <div className="mb-2 rounded-lg overflow-hidden">
          <img 
            src={message.media_url} 
            alt="Shared image" 
            className="max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(message.media_url!, '_blank')}
          />
        </div>
      );
    }

    if (message.media_type === 'video') {
      return (
        <div className="mb-2 rounded-lg overflow-hidden relative">
          <video 
            src={message.media_url} 
            controls 
            className="max-w-full max-h-64"
            preload="metadata"
          />
        </div>
      );
    }

    if (message.media_type === 'audio') {
      return (
        <div className="mb-2">
          <audio 
            src={message.media_url} 
            controls 
            className="w-full max-w-[250px]"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div
        className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-message-in group`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        {/* Emoji picker for received messages */}
        {!isSent && (
          <div className="self-end mb-2 mr-1">
            <EmojiPicker onEmojiSelect={handleAddReaction} />
          </div>
        )}

        <div className="flex flex-col">
          <div
            className={`max-w-[75%] px-4 py-2.5 ${
              isSent ? 'message-bubble-sent' : 'message-bubble-received'
            } cursor-pointer select-none`}
          >
            {renderMediaContent()}
            
            {message.content && message.media_type !== 'audio' && (
              <p className="text-[15px] leading-relaxed break-words">
                {message.content}
              </p>
            )}
            
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
                <ReadReceipt isRead={message.is_read} readAt={message.read_at} />
              )}
            </div>
          </div>

          {/* Message Reactions */}
          <MessageReactions messageId={message.id} isSent={isSent} />
        </div>

        {/* Emoji picker for sent messages */}
        {isSent && (
          <div className="self-end mb-2 ml-1">
            <EmojiPicker onEmojiSelect={handleAddReaction} />
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be deleted for everyone. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(message.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete for Everyone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
