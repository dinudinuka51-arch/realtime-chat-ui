import { MessageCircle, Home, User, ShoppingBag, Package, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminCheck } from '@/hooks/useAdminCheck';

type ViewType = 'chat' | 'feed' | 'store' | 'profile' | 'marketplace' | 'admin';

interface BottomNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

export const BottomNav = ({ currentView, onNavigate }: BottomNavProps) => {
  const { isAdmin } = useAdminCheck();

  const navItems = [
    { id: 'chat' as ViewType, icon: MessageCircle, label: 'Chat' },
    { id: 'feed' as ViewType, icon: Home, label: 'Feed' },
    { id: 'marketplace' as ViewType, icon: Package, label: 'Market' },
    { id: 'store' as ViewType, icon: ShoppingBag, label: 'Store' },
    { id: 'profile' as ViewType, icon: User, label: 'Profile' },
    ...(isAdmin ? [{ id: 'admin' as ViewType, icon: Shield, label: 'Admin' }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t md:hidden">
      <div className="flex items-center justify-around h-16 px-4 safe-area-pb">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
