import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Settings, LogOut, Edit2, Moon, Sun, Bell, BellOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ProfileEditDialog } from '@/components/chat/ProfileEditDialog';
import { DeleteAccountDialog } from '@/components/chat/DeleteAccountDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import romanLogo from '@/assets/roman-logo.png';
import { ProfileSkeleton } from '@/components/ui/skeleton-loaders';

interface ProfileViewProps {
  onBack: () => void;
}

export const ProfileView = ({ onBack }: ProfileViewProps) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { permission, requestPermission, isSupported } = useNotifications();
  const [profile, setProfile] = useState<{
    username: string;
    full_name?: string;
    avatar_url?: string;
    status?: string;
  } | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [stats, setStats] = useState({ posts: 0, stories: 0 });
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url, status')
      .eq('user_id', user.id)
      .single();
    
    if (data) setProfile(data);
    setLoading(false);
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    const [postsResult, storiesResult] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('stories').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    setStats({
      posts: postsResult.count || 0,
      stories: storiesResult.count || 0,
    });
  }, [user]);

  useEffect(() => {
    Promise.all([fetchProfile(), fetchStats()]);
  }, [fetchProfile, fetchStats]);

  const handleNotificationToggle = async () => {
    if (permission === 'granted') {
      toast.info('To disable notifications, use your browser settings');
    } else {
      const granted = await requestPermission();
      if (granted) {
        toast.success('Notifications enabled!');
      } else {
        toast.error('Notifications permission denied');
      }
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Failed to log out');
    } else {
      toast.success('Logged out successfully');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img src={romanLogo} alt="Roman" className="h-8 w-8 rounded-lg" />
        <h1 className="text-xl font-bold">Profile</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <ProfileSkeleton />
        ) : (
          <>
        {/* Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {profile?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{profile?.full_name || profile?.username}</h2>
                <p className="text-muted-foreground">@{profile?.username}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {profile?.status || 'Hey there! I am using Roman.'}
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={() => setShowEditDialog(true)}>
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mt-6 justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.posts}</p>
                <p className="text-sm text-muted-foreground">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.stories}</p>
                <p className="text-sm text-muted-foreground">Stories</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </h3>
            <Separator />

            {/* Notifications Toggle */}
            {isSupported && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {permission === 'granted' ? (
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span>Push Notifications</span>
                </div>
                <Switch
                  checked={permission === 'granted'}
                  onCheckedChange={handleNotificationToggle}
                />
              </div>
            )}

            <Separator />

            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                )}
                <span>Dark Mode</span>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>

            <Separator />

            {/* Logout */}
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Log Out
            </Button>

            <Separator />

            {/* Delete Account */}
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>Roman v1.0.0</p>
          <p>Powered by Roman Technologies</p>
        </div>
          </>
        )}
      </div>

      {/* Dialogs */}
      <ProfileEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        profile={profile ? { 
          id: '', 
          user_id: user?.id || '', 
          username: profile.username, 
          full_name: profile.full_name || null, 
          avatar_url: profile.avatar_url || null, 
          status: profile.status || null,
          is_online: true,
          last_seen: new Date().toISOString(),
          created_at: '',
          updated_at: ''
        } : null}
        onProfileUpdated={fetchProfile}
      />

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </div>
  );
};
