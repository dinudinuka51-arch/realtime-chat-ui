import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Post } from '@/types/feed';
import { CreatePostForm } from './CreatePostForm';
import { PostCard } from './PostCard';
import { StoriesBar } from '@/components/stories/StoriesBar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import romanLogo from '@/assets/roman-logo.png';
import { FeedSkeleton } from '@/components/ui/skeleton-loaders';

interface RomanFeedProps {
  onBack: () => void;
}

export const RomanFeed = ({ onBack }: RomanFeedProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | undefined>();

  const fetchPosts = useCallback(async () => {
    try {
      // Fetch posts with profile info
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profile:profiles!posts_user_id_fkey(username, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = postsData.map(p => p.id);

      // Batch fetch: Get all likes at once
      const { data: allLikes } = await supabase
        .from('post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      // Batch fetch: Get all comments counts at once
      const { data: allComments } = await supabase
        .from('post_comments')
        .select('post_id')
        .in('post_id', postIds);

      // Build maps for quick lookup
      const likesCountMap = new Map<string, number>();
      const userLikesMap = new Map<string, boolean>();
      allLikes?.forEach(like => {
        likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1);
        if (like.user_id === user?.id) {
          userLikesMap.set(like.post_id, true);
        }
      });

      const commentsCountMap = new Map<string, number>();
      allComments?.forEach(comment => {
        commentsCountMap.set(comment.post_id, (commentsCountMap.get(comment.post_id) || 0) + 1);
      });

      // Build posts with stats
      const postsWithStats = postsData.map((post: any) => ({
        ...post,
        profile: post.profile,
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        is_liked: userLikesMap.get(post.id) || false,
      }));

      setPosts(postsWithStats);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setUserProfile(data);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();
    fetchUserProfile();
  }, [fetchPosts, fetchUserProfile]);

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('feed-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => fetchPosts()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_likes' },
        () => fetchPosts()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_comments' },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img src={romanLogo} alt="RomanFeed" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold gradient-text">RomanFeed</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchPosts}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stories Bar */}
      <StoriesBar />

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Create Post */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CreatePostForm onPostCreated={fetchPosts} userProfile={userProfile} />
          </motion.div>
        )}

        {/* Posts Feed */}
        {loading ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
