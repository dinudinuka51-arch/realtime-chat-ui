import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { WelcomeScreen } from './WelcomeScreen';
import { UserMenu } from './UserMenu';
import { MessageCircle } from 'lucide-react';

export const ChatLayout = () => {
  const { user } = useAuth();
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
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Roman</span>
          </div>
          <UserMenu />
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
  );
};
