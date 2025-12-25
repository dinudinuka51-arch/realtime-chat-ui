import { Shield, Zap, Globe } from 'lucide-react';
import romanLogo from '@/assets/roman-logo.png';

export const WelcomeScreen = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-chat-bg p-8">
      <div className="max-w-md text-center animate-fade-in">
        {/* Logo */}
        <img src={romanLogo} alt="Roman Logo" className="w-24 h-24 rounded-3xl mb-6 shadow-lg mx-auto" />

        <h1 className="text-3xl font-bold text-foreground mb-3">
          Welcome to Roman
        </h1>
        <p className="text-muted-foreground mb-8">
          Send and receive messages instantly. Select a conversation to start chatting.
        </p>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center p-4 rounded-xl bg-card shadow-sm">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Real-time</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-xl bg-card shadow-sm">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Secure</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-xl bg-card shadow-sm">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
