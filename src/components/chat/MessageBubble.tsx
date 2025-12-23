import { useState } from 'react';
import { Message } from '@/types/chat';
import { format } from 'date-fns';
import { Trash2, Play, Image as ImageIcon, Video } from 'lucide-react';
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

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  onDelete: (messageId: string) => void;
}

export const MessageBubble = ({ message, isSent, onDelete }: MessageBubbleProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLongPress, setIsLongPress] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const formatMessageTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm');
  };

  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      setIsLongPress(true);
      setShowDeleteDialog(true);
    }, 500);
    setPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    setIsLongPress(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowDeleteDialog(true);
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

    return null;
  };

  return (
    <>
      <div
        className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-message-in`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        <div
          className={`max-w-[75%] px-4 py-2.5 ${
            isSent ? 'message-bubble-sent' : 'message-bubble-received'
          } cursor-pointer select-none`}
        >
          {renderMediaContent()}
          
          {message.content && (
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
