import { useState } from 'react';
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
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative h-14 w-14 rounded-full shadow-2xl overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          }}
        >
          {/* Animated gradient overlay */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #667eea 50%, #764ba2 100%)',
            }}
            animate={{
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3,
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
              repeatDelay: 3,
              ease: "easeInOut",
            }}
          />
          
          {/* AI Icon - Meta-style colorful ring */}
          <div className="relative z-10 flex items-center justify-center h-full">
            <svg
              viewBox="0 0 100 100"
              className="w-10 h-10"
              fill="none"
            >
              {/* Outer glow ring */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="url(#ringGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                className="drop-shadow-lg"
              />
              
              {/* AI symbol - stylized brain/sparkle */}
              <motion.path
                d="M50 25 L55 40 L70 45 L55 50 L50 65 L45 50 L30 45 L45 40 Z"
                fill="white"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{ transformOrigin: '50px 45px' }}
              />
              
              {/* Sparkle dots */}
              <motion.circle
                cx="65"
                cy="30"
                r="3"
                fill="white"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.circle
                cx="35"
                cy="60"
                r="2"
                fill="white"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
              
              {/* Gradient definitions */}
              <defs>
                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#f0f0ff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0.9" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          {/* Online indicator */}
          <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white shadow-lg z-20">
            <motion.div
              className="absolute inset-0 bg-green-400 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.button>
      </motion.div>
      <RomanAIChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
