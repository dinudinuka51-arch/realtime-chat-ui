import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  username?: string;
}

export const TypingIndicator = ({ username }: TypingIndicatorProps) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center gap-1 px-3 py-2 bg-secondary rounded-xl">
        <motion.div
          className="w-2 h-2 bg-muted-foreground rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-muted-foreground rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-muted-foreground rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      {username && (
        <span className="text-xs text-muted-foreground">
          {username} is typing...
        </span>
      )}
    </div>
  );
};
