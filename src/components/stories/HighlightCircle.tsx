import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HighlightCircleProps {
  title: string;
  coverUrl?: string;
  isNew?: boolean;
  onClick: () => void;
}

export const HighlightCircle = ({
  title,
  coverUrl,
  isNew = false,
  onClick,
}: HighlightCircleProps) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-[70px]"
    >
      <div
        className={cn(
          "p-[2px] rounded-full",
          isNew ? "bg-muted" : "bg-gradient-to-tr from-primary/50 to-primary"
        )}
      >
        <div className="bg-background p-[2px] rounded-full">
          <Avatar className="h-14 w-14">
            {isNew ? (
              <div className="h-full w-full flex items-center justify-center bg-muted">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
            ) : (
              <>
                <AvatarImage src={coverUrl} alt={title} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {title.charAt(0).toUpperCase()}
                </AvatarFallback>
              </>
            )}
          </Avatar>
        </div>
      </div>
      <span className="text-xs text-muted-foreground truncate max-w-[60px]">
        {title}
      </span>
    </button>
  );
};
