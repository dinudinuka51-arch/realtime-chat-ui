import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StoryCircle } from './StoryCircle';
import { StoryViewer } from './StoryViewer';
import { CreateStory } from './CreateStory';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StoriesBarSkeleton } from '@/components/ui/skeleton-loaders';

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  caption?: string;
  created_at: string;
  user_id: string;
  expires_at: string;
  profile?: {
    username: string;
    avatar_url?: string;
  };
}

interface UserStories {
  userId: string;
  username: string;
  avatarUrl?: string;
  stories: Story[];
  hasUnseenStory: boolean;
}

export const StoriesBar = () => {
  const { user } = useAuth();
  const [userStoriesGroups, setUserStoriesGroups] = useState<UserStories[]>([]);
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());
  const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(null);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string; avatar_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    try {
      const { data: stories, error } = await supabase
        .from('stories')
        .select(`
          *,
          profile:profiles!stories_user_id_fkey(username, avatar_url)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stories:', error);
        return;
      }

    // Fetch viewed stories for current user
    if (user) {
      const { data: views } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', user.id);

      if (views) {
        setViewedStoryIds(new Set(views.map((v) => v.story_id)));
      }
    }

    // Group stories by user
    const groupedMap = new Map<string, UserStories>();
    
    stories?.forEach((story) => {
      const existing = groupedMap.get(story.user_id);
      const storyWithProfile = {
        ...story,
        profile: story.profile as { username: string; avatar_url?: string } | undefined,
      };
      
      if (existing) {
        existing.stories.push(storyWithProfile);
      } else {
        groupedMap.set(story.user_id, {
          userId: story.user_id,
          username: story.profile?.username || 'User',
          avatarUrl: story.profile?.avatar_url,
          stories: [storyWithProfile],
          hasUnseenStory: false,
        });
      }
    });

    // Calculate unseen status and sort
    const groups = Array.from(groupedMap.values()).map((group) => ({
      ...group,
      hasUnseenStory: group.stories.some((s) => !viewedStoryIds.has(s.id)),
    }));

    // Put current user's stories first
    groups.sort((a, b) => {
      if (a.userId === user?.id) return -1;
      if (b.userId === user?.id) return 1;
      if (a.hasUnseenStory && !b.hasUnseenStory) return -1;
      if (!a.hasUnseenStory && b.hasUnseenStory) return 1;
      return 0;
    });

      setUserStoriesGroups(groups);
    } finally {
      setLoading(false);
    }
  }, [user, viewedStoryIds]);

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('user_id', user.id)
      .single();
    if (data) setUserProfile(data);
  }, [user]);

  useEffect(() => {
    fetchStories();
    fetchUserProfile();
  }, [fetchStories, fetchUserProfile]);

  useEffect(() => {
    const channel = supabase
      .channel('stories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, fetchStories)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStories]);

  const handleStoryViewed = async (storyId: string) => {
    if (!user || viewedStoryIds.has(storyId)) return;

    setViewedStoryIds((prev) => new Set([...prev, storyId]));

    await supabase.from('story_views').insert({
      story_id: storyId,
      viewer_id: user.id,
    });
  };

  const currentUserHasStory = userStoriesGroups.some((g) => g.userId === user?.id);

  // Flatten all stories for the viewer
  const allStories = userStoriesGroups.flatMap((g) => g.stories);
  const getStartIndex = (userIndex: number) => {
    let index = 0;
    for (let i = 0; i < userIndex; i++) {
      index += userStoriesGroups[i].stories.length;
    }
    return index;
  };

  if (loading) {
    return <StoriesBarSkeleton />;
  }

  return (
    <>
      <div className="bg-card border-b">
        <ScrollArea className="w-full">
          <div className="flex gap-3 p-4">
            {/* Add Story Button */}
            {user && (
              <button
                onClick={() => setShowCreateStory(true)}
                className="flex flex-col items-center gap-1 min-w-[70px]"
              >
                <div className="relative">
                  <div className="p-[3px] rounded-full bg-muted">
                    <div className="bg-background p-[2px] rounded-full">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={userProfile?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                    <Plus className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Add story</span>
              </button>
            )}

            {/* Story Circles */}
            {userStoriesGroups.map((group, index) => (
              <StoryCircle
                key={group.userId}
                username={group.username}
                avatarUrl={group.avatarUrl}
                hasUnseenStory={group.hasUnseenStory}
                isOwn={group.userId === user?.id}
                onClick={() => setSelectedUserIndex(index)}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Story Viewer */}
      {selectedUserIndex !== null && allStories.length > 0 && (
        <StoryViewer
          stories={allStories}
          initialIndex={getStartIndex(selectedUserIndex)}
          onClose={() => setSelectedUserIndex(null)}
          onStoryViewed={handleStoryViewed}
        />
      )}

      {/* Create Story */}
      {showCreateStory && user && (
        <CreateStory
          userId={user.id}
          onClose={() => setShowCreateStory(false)}
          onStoryCreated={fetchStories}
        />
      )}
    </>
  );
};
