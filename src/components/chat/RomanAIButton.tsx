import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles } from 'lucide-react';
import { RomanAIChat } from './RomanAIChat';
import { motion } from 'framer-motion';

export const RomanAIButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-20 right-4 z-40 md:bottom-6"
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Bot className="h-6 w-6" />
          <Sparkles className="absolute top-1 right-1 h-3 w-3 text-yellow-300 animate-pulse" />
        </Button>
      </motion.div>
      <RomanAIChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
