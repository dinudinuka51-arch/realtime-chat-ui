import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, Loader2, Sparkles, X, Video, MessageCircle, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  videoUrl?: string;
  videoPending?: boolean;
}

interface RomanAIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RomanAIChat = ({ isOpen, onClose }: RomanAIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m Roman, your AI assistant. How can I help you today? 🤖'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [videoMode, setVideoMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateVideo = async (promptText: string) => {
    setMessages(prev => [...prev, { role: 'user', content: promptText }]);
    setIsLoading(true);
    const placeholderIndex = messages.length + 1;
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '🎬 Creating your video... this usually takes 1-3 minutes.',
      videoPending: true,
    }]);

    try {
      const { data, error } = await supabase.functions.invoke('roman-video', {
        body: { action: 'create', prompt: promptText, orientation: 'portrait', seconds: 5 },
      });
      if (error || data?.error) throw new Error(data?.error || 'Could not start the video.');

      const id = data.id;
      const started = Date.now();

      // Poll until the render finishes (max ~8 minutes)
      while (Date.now() - started < 8 * 60 * 1000) {
        await new Promise(r => setTimeout(r, 6000));
        const { data: s } = await supabase.functions.invoke('roman-video', {
          body: { action: 'status', id },
        });
        if (s?.status === 'complete' && s?.url) {
          setMessages(prev => prev.map((m, i) => i === placeholderIndex
            ? { role: 'assistant', content: 'Here is your video! 🎥', videoUrl: s.url }
            : m));
          return;
        }
        if (s?.status === 'error' || s?.error) {
          throw new Error(s?.error || 'Video generation failed.');
        }
        if (typeof s?.progress === 'number') {
          setMessages(prev => prev.map((m, i) => i === placeholderIndex
            ? { ...m, content: `🎬 Creating your video... ${Math.round(s.progress)}%` }
            : m));
        }
      }
      throw new Error('Video is taking too long. Please try again.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Video generation failed.';
      toast.error(msg);
      setMessages(prev => prev.map((m, i) => i === placeholderIndex
        ? { role: 'assistant', content: `Sorry, ${msg}` }
        : m));
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    if (videoMode) {
      await generateVideo(userMessage);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);


    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const invokeAI = () => supabase.functions.invoke('roman-ai', {
        body: { message: userMessage, conversationHistory }
      });

      let { data, error } = await invokeAI();

      // Auto-retry once on transient failures (rate limits, cold starts)
      if (error) {
        await new Promise(r => setTimeout(r, 2000));
        ({ data, error } = await invokeAI());
      }

      if (error) {
        // Try to surface the real error message from the function
        let msg = 'Failed to get response from Roman AI';
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.error) msg = body.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error sending message:', error);
      const msg = error instanceof Error ? error.message : 'Failed to get response from Roman AI';
      toast.error(msg);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Sorry, I hit a problem: ${msg}. Please try again in a moment.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed bottom-20 right-4 z-50 w-[360px] h-[500px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                {/* Meta AI style avatar */}
                <div 
                  className="h-10 w-10 rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-6 h-6" fill="none">
                    <path
                      d="M50 20 L57 38 L75 43 L57 48 L50 66 L43 48 L25 43 L43 38 Z"
                      fill="white"
                    />
                    <circle cx="68" cy="28" r="4" fill="white" opacity="0.8" />
                    <circle cx="32" cy="58" r="3" fill="white" opacity="0.6" />
                  </svg>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">Roman AI</span>
                  <svg className="h-4 w-4" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="11" fill="#1D9BF0"/>
                    <path d="M9.5 14.5L6.5 11.5L7.5 10.5L9.5 12.5L14.5 7.5L15.5 8.5L9.5 14.5Z" fill="white"/>
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground">AI Assistant • Online</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.videoPending && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-2" />
                    )}
                    {message.videoUrl && (
                      <div className="mt-2 space-y-2">
                        <video
                          src={message.videoUrl}
                          controls
                          playsInline
                          className="w-full rounded-xl"
                        />
                        <a
                          href={message.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Button
                type="button"
                size="sm"
                variant={videoMode ? 'default' : 'secondary'}
                onClick={() => setVideoMode(v => !v)}
                className="rounded-full h-7 px-3 text-xs gap-1.5"
              >
                {videoMode ? <Video className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                {videoMode ? 'Video mode' : 'Chat mode'}
              </Button>
              {videoMode && (
                <span className="text-[11px] text-muted-foreground">Describe the video you want</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={videoMode ? 'Describe your video...' : 'Ask Roman anything...'}
                className="flex-1 rounded-full bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="rounded-full shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
