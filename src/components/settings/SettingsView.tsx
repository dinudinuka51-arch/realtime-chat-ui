import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, Bell, Moon, Sun, Shield, User, 
  Palette, Globe, Lock, Smartphone, Info
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useNotifications } from '@/hooks/useNotifications';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { toast } from 'sonner';
import romanLogo from '@/assets/roman-logo.png';

interface SettingsViewProps {
  onBack: () => void;
  onNavigateToAdmin?: () => void;
}

export const SettingsView = ({ onBack, onNavigateToAdmin }: SettingsViewProps) => {
  const { theme, setTheme } = useTheme();
  const { permission, requestPermission, isSupported } = useNotifications();
  const { isAdmin, isSuperAdmin } = useAdminCheck();
  const [notificationsEnabled, setNotificationsEnabled] = useState(permission === 'granted');

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      if (!isSupported) {
        toast.error('Push notifications are not supported on this device');
        return;
      }
      if (permission === 'denied') {
        toast.error('Notifications are blocked. Please enable them in browser settings.');
        return;
      }
      await requestPermission();
      setNotificationsEnabled(true);
    } else {
      setNotificationsEnabled(false);
      toast.info('Notifications disabled');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img src={romanLogo} alt="Roman" className="w-8 h-8 rounded-lg" />
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Admin Access - Only show for admins */}
        {isAdmin && onNavigateToAdmin && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <button 
                onClick={onNavigateToAdmin}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Admin Panel</p>
                    <p className="text-xs text-muted-foreground">
                      {isSuperAdmin ? 'Super Admin Access' : 'Manage platform settings'}
                    </p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        )}

        {/* Appearance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="w-5 h-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Sun className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Use dark theme for the app
                  </p>
                </div>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified about new messages
                  </p>
                </div>
              </div>
              <Switch
                id="push-notifications"
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationToggle}
                disabled={permission === 'denied'}
              />
            </div>
            {permission === 'denied' && (
              <p className="text-xs text-destructive">
                Notifications are blocked. Enable them in your browser settings.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="w-5 h-5" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Online Status</p>
                  <p className="text-xs text-muted-foreground">
                    Show when you're online
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Profile Visibility</p>
                  <p className="text-xs text-muted-foreground">
                    Allow others to find you
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="w-5 h-5" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Build</span>
              <span>2026.01</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsView;
