import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  // Show notification
  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') return;
    
    try {
      const notification = new Notification(title, {
        icon: '/roman-logo.png',
        badge: '/roman-logo.png',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Notification error:', error);
    }
  }, [permission]);

  // Check permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Subscribe to new messages
  useEffect(() => {
    if (!user || permission !== 'granted') return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message = payload.new as any;
          
          // Only notify for messages from others
          if (message.sender_id === user.id) return;
          
          // Don't notify if page is visible
          if (document.visibilityState === 'visible') return;

          // Get sender profile
          const { data: sender } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('user_id', message.sender_id)
            .single();

          if (sender) {
            showNotification(sender.full_name || sender.username, {
              body: message.content || 'Sent you a message',
              tag: `message-${message.conversation_id}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_likes',
        },
        async (payload) => {
          const like = payload.new as any;
          
          // Check if this is a like on our post
          const { data: post } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', like.post_id)
            .single();

          if (post?.user_id !== user.id) return;
          if (like.user_id === user.id) return;
          if (document.visibilityState === 'visible') return;

          // Get liker profile
          const { data: liker } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('user_id', like.user_id)
            .single();

          if (liker) {
            showNotification('New Like ❤️', {
              body: `${liker.full_name || liker.username} liked your post`,
              tag: `like-${like.post_id}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'story_views',
        },
        async (payload) => {
          const view = payload.new as any;
          
          // Check if this is a view on our story
          const { data: story } = await supabase
            .from('stories')
            .select('user_id')
            .eq('id', view.story_id)
            .single();

          if (story?.user_id !== user.id) return;
          if (view.viewer_id === user.id) return;
          if (document.visibilityState === 'visible') return;

          // Get viewer profile
          const { data: viewer } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('user_id', view.viewer_id)
            .single();

          if (viewer) {
            showNotification('Story View 👁️', {
              body: `${viewer.full_name || viewer.username} viewed your story`,
              tag: `story-view-${view.story_id}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, permission, showNotification]);

  return {
    permission,
    requestPermission,
    showNotification,
    isSupported: 'Notification' in window,
  };
};
