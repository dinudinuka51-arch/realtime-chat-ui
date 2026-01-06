import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { WelcomeScreen } from './WelcomeScreen';
import { UserMenu } from './UserMenu';
import { OfflineBanner } from './OfflineBanner';
import { Button } from '@/components/ui/button';
import { Newspaper, Shield } from 'lucide-react';
import romanLogo from '@/assets/roman-logo.png';

interface ChatLayoutProps {
  onNavigateToFeed?: () => void;
  onNavigateToAdmin?: () => void;
}

export const ChatLayout = ({ onNavigateToFeed, onNavigateToAdmin }: ChatLayoutProps) => {
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
  };

  return (
    <>
      <OfflineBanner />
      <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar - Conversation List */}
      <div
        className={`${
          showMobileChat ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-[380px] lg:w-[420px] border-r border-border`}
      >
        {/* App Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <img src={romanLogo} alt="Roman Logo" className="w-10 h-10 rounded-xl" />
            <span className="text-xl font-bold text-foreground">Roman</span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToFeed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNavigateToFeed}
                title="RomanFeed"
              >
                <Newspaper className="h-5 w-5" />
              </Button>
            )}
            {isAdmin && onNavigateToAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNavigateToAdmin}
                title="Admin Panel"
              >
                <Shield className="h-5 w-5" />
              </Button>
            )}
            <UserMenu onNavigateToAdmin={onNavigateToAdmin} />
          </div>
        </div>

        <ConversationList
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Main Chat Area */}
      <div
        className={`${
          showMobileChat ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col`}
      >
        {selectedConversation ? (
          <ChatWindow
            conversationId={selectedConversation}
            onBack={handleBackToList}
          />
        ) : (
          <WelcomeScreen />
        )}
      </div>
      </div>
    </>
  );
};
