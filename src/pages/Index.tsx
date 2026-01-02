import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { RomanFeed } from '@/components/feed/RomanFeed';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { SplashScreen } from '@/components/SplashScreen';

type AppView = 'chat' | 'feed' | 'admin';

const Index = () => {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('chat');

  // Check if splash was already shown this session
  useEffect(() => {
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Roman...</p>
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
        return <RomanFeed onBack={() => setCurrentView('chat')} />;
      case 'admin':
        return <AdminPanel onBack={() => setCurrentView('chat')} />;
      default:
        return (
          <ChatLayout 
            onNavigateToFeed={() => setCurrentView('feed')}
            onNavigateToAdmin={() => setCurrentView('admin')}
          />
        );
    }
  };

  return renderView();
};

export default Index;
