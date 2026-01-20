import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Post } from '@/types/feed';
import { CreatePostForm } from './CreatePostForm';
import { PostCard } from './PostCard';
import { StoriesBar } from '@/components/stories/StoriesBar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Sparkles, TrendingUp, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import romanLogo from '@/assets/roman-logo.png';
import { FeedSkeleton } from '@/components/ui/skeleton-loaders';

interface RomanFeedProps {
  onBack: () => void;
}

export const RomanFeed = ({ onBack }: RomanFeedProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      setRefreshing(false);
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-16 md:pb-0">
      {/* Enhanced Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden hover:bg-primary/10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <motion.div 
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="relative">
                  <img src={romanLogo} alt="RomanFeed" className="w-10 h-10 rounded-xl shadow-lg" />
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    RomanFeed
                  </h1>
                  <p className="text-[10px] text-muted-foreground -mt-0.5">Share your moments</p>
                </div>
              </motion.div>
            </div>
            <motion.div whileTap={{ rotate: 180 }} transition={{ duration: 0.3 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefresh}
                disabled={refreshing}
                className="hover:bg-primary/10"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </motion.div>
          </div>
          
          {/* Quick Stats Bar */}
          <motion.div 
            className="flex items-center gap-4 mt-3 py-2 px-3 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{posts.length}</span> posts
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              <span>Trending</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Live updates</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stories Bar with enhanced styling */}
      <div className="bg-gradient-to-b from-card/50 to-transparent">
        <StoriesBar />
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Create Post with animation */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <CreatePostForm onPostCreated={fetchPosts} userProfile={userProfile} />
          </motion.div>
        )}

        {/* Posts Feed */}
        {loading ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <motion.div 
            className="text-center py-16 px-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground text-sm">Be the first to share something amazing!</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-5">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PostCard post={post} onUpdate={fetchPosts} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
        
        {/* End of feed indicator */}
        {posts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-muted-foreground text-sm">
              <Sparkles className="h-4 w-4" />
              You're all caught up!
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
