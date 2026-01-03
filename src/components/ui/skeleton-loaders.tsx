import { Skeleton } from '@/components/ui/skeleton';

export const ConversationSkeleton = () => (
  <div className="flex items-center gap-3 p-3">
    <Skeleton className="w-12 h-12 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-48" />
    </div>
  </div>
);

export const ConversationListSkeleton = () => (
  <div className="space-y-1">
    {[1, 2, 3, 4, 5].map(i => (
      <ConversationSkeleton key={i} />
    ))}
  </div>
);

export const MessageSkeleton = ({ isSent = false }: { isSent?: boolean }) => (
  <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[70%] space-y-1 ${isSent ? 'items-end' : 'items-start'}`}>
      <Skeleton className={`h-10 ${isSent ? 'w-32' : 'w-48'} rounded-2xl`} />
    </div>
  </div>
);

export const ChatWindowSkeleton = () => (
  <div className="h-full flex flex-col bg-chat-bg">
    {/* Header skeleton */}
    <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
    {/* Messages skeleton */}
    <div className="flex-1 p-4 space-y-3">
      <MessageSkeleton isSent={false} />
      <MessageSkeleton isSent={true} />
      <MessageSkeleton isSent={false} />
      <MessageSkeleton isSent={true} />
    </div>
  </div>
);

export const StorySkeleton = () => (
  <div className="flex flex-col items-center gap-1">
    <Skeleton className="w-16 h-16 rounded-full" />
    <Skeleton className="h-3 w-12" />
  </div>
);

export const StoriesBarSkeleton = () => (
  <div className="flex gap-4 p-4 overflow-hidden">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <StorySkeleton key={i} />
    ))}
  </div>
);

export const PostSkeleton = () => (
  <div className="bg-card rounded-2xl p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-48 w-full rounded-xl" />
  </div>
);

export const FeedSkeleton = () => (
  <div className="space-y-4 p-4">
    <PostSkeleton />
    <PostSkeleton />
  </div>
);

export const ProfileSkeleton = () => (
  <div className="p-6 space-y-6">
    <div className="flex flex-col items-center gap-4">
      <Skeleton className="w-24 h-24 rounded-full" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-24" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
    </div>
  </div>
);
