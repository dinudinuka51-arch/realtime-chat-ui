import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-destructive to-destructive/80 px-4 py-3 flex items-center justify-center gap-3 shadow-lg backdrop-blur-sm">
        <WifiOff className="w-5 h-5 text-destructive-foreground animate-pulse" />
        <span className="text-sm font-medium text-destructive-foreground">
          You're offline. Check your connection.
        </span>
        <button 
          onClick={() => window.location.reload()}
          className="ml-2 p-1.5 rounded-full bg-destructive-foreground/20 hover:bg-destructive-foreground/30 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-destructive-foreground" />
        </button>
      </div>
    </div>
  );
};
