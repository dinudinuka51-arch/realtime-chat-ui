import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { RomanGames } from './RomanGames';

export const RomanGamesButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-20 left-4 z-40 md:bottom-6"
      >
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative h-14 w-14 rounded-full shadow-2xl overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
          }}
        >
          {/* Animated gradient overlay */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #f97316 50%, #ea580c 100%)',
            }}
            animate={{
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 2,
              ease: "easeInOut",
            }}
          />
          
          {/* Icon */}
          <div className="relative z-10 flex items-center justify-center h-full">
            <Gamepad2 className="h-7 w-7 text-white" />
          </div>
          
          {/* Pulse indicator */}
          <motion.div
            className="absolute top-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-lg z-20"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-green-900">
              ▶
            </span>
          </motion.div>
        </motion.button>
      </motion.div>
      
      <RomanGames isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
