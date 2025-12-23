import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReadReceiptProps {
  isRead: boolean;
  readAt?: string | null;
}

export const ReadReceipt = ({ isRead, readAt }: ReadReceiptProps) => {
  const formatReadTime = (dateStr: string) => {
    return format(new Date(dateStr), 'MMM d, HH:mm');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`text-[10px] cursor-help ${
              isRead
                ? 'text-message-sent-foreground'
                : 'text-message-sent-foreground/50'
            }`}
          >
            {isRead ? '✓✓' : '✓'}
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="glass border-border">
          <p className="text-xs">
            {isRead && readAt
              ? `Seen at ${formatReadTime(readAt)}`
              : isRead
              ? 'Seen'
              : 'Sent'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
