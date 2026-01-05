import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { AuthForm } from '@/components/auth/AuthForm';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { SplashScreen } from '@/components/SplashScreen';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load non-critical views
const RomanFeed = lazy(() => import('@/components/feed/RomanFeed').then(m => ({ default: m.RomanFeed })));
const AdminPanel = lazy(() => import('@/components/admin/AdminPanel').then(m => ({ default: m.AdminPanel })));
const ProfileView = lazy(() => import('@/components/profile/ProfileView').then(m => ({ default: m.ProfileView })));
const StoreView = lazy(() => import('@/components/store/StoreView').then(m => ({ default: m.StoreView })));
const MarketplaceView = lazy(() => import('@/components/marketplace/MarketplaceView').then(m => ({ default: m.MarketplaceView })));

type AppView = 'chat' | 'feed' | 'store' | 'profile' | 'admin' | 'marketplace';

const ViewSkeleton = () => (
  <div className="min-h-screen bg-background p-4 space-y-4">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-6 w-32" />
    </div>
    <Skeleton className="h-48 w-full rounded-xl" />
    <Skeleton className="h-32 w-full rounded-xl" />
    <Skeleton className="h-32 w-full rounded-xl" />
  </div>
);

const Index = () => {
  const { user, loading } = useAuth();
  const { permission, requestPermission, isSupported } = useNotifications();
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('chat');
  const [notificationPrompted, setNotificationPrompted] = useState(false);

  // Check if splash was already shown this session
  useEffect(() => {
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown) {
      setShowSplash(false);
    }
  }, []);

  // Request notification permission once user is logged in
  useEffect(() => {
    if (user && isSupported && permission === 'default' && !notificationPrompted) {
      setNotificationPrompted(true);
      // Delay the prompt slightly for better UX
      const timer = setTimeout(() => {
        requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, isSupported, permission, notificationPrompted, requestPermission]);

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  }, []);

  const handleNavigate = useCallback((view: AppView) => {
    setCurrentView(view);
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'feed':
        return (
          <Suspense fallback={<ViewSkeleton />}>
            <RomanFeed onBack={() => handleNavigate('chat')} />
          </Suspense>
        );
      case 'admin':
        return (
          <Suspense fallback={<ViewSkeleton />}>
            <AdminPanel onBack={() => handleNavigate('chat')} />
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={<ViewSkeleton />}>
            <ProfileView onBack={() => handleNavigate('chat')} />
          </Suspense>
        );
      case 'store':
        return (
          <Suspense fallback={<ViewSkeleton />}>
            <StoreView onBack={() => handleNavigate('chat')} />
          </Suspense>
        );
      case 'marketplace':
        return (
          <Suspense fallback={<ViewSkeleton />}>
            <MarketplaceView onBack={() => handleNavigate('chat')} />
          </Suspense>
        );
      default:
        return (
          <ChatLayout 
            onNavigateToFeed={() => handleNavigate('feed')}
            onNavigateToAdmin={() => handleNavigate('admin')}
          />
        );
    }
  };

  // Determine bottom nav visibility (hide on admin view)
  const showBottomNav = currentView !== 'admin';
  // Map current view to bottom nav view type
  const bottomNavView = currentView === 'admin' ? 'chat' : currentView;

  return (
    <>
      {renderView()}
      {showBottomNav && (
        <BottomNav 
          currentView={bottomNavView} 
          onNavigate={handleNavigate} 
        />
      )}
    </>
  );
};

export default Index;
