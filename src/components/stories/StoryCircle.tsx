import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface StoryCircleProps {
  username: string;
  avatarUrl?: string;
  hasUnseenStory: boolean;
  isOwn?: boolean;
  onClick: () => void;
}

export const StoryCircle = ({
  username,
  avatarUrl,
  hasUnseenStory,
  isOwn = false,
  onClick,
}: StoryCircleProps) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-[70px]"
    >
      <div
        className={cn(
          "p-[3px] rounded-full",
          hasUnseenStory
            ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600"
            : isOwn
            ? "bg-muted"
            : "bg-muted/50"
        )}
      >
        <div className="bg-background p-[2px] rounded-full">
          <Avatar className="h-14 w-14">
            <AvatarImage src={avatarUrl} alt={username} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <span className="text-xs text-muted-foreground truncate max-w-[60px]">
        {isOwn ? 'Your story' : username}
      </span>
    </button>
  );
};
