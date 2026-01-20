import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { RomanGames } from './RomanGames';
import { GamePasswordDialog } from './GamePasswordDialog';

interface RomanGamesButtonProps {
  className?: string;
}

export const RomanGamesButton = ({ className }: RomanGamesButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const handleClick = () => {
    // Check if already verified in this session
    const isVerified = sessionStorage.getItem('games_verified') === 'true';
    if (isVerified) {
      setIsOpen(true);
    } else {
      setShowPasswordDialog(true);
    }
  };

  const handlePasswordSuccess = () => {
    setIsOpen(true);
  };

  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={className}
      >
        <motion.button
          onClick={handleClick}
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
      
      <GamePasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={setShowPasswordDialog}
        onSuccess={handlePasswordSuccess}
      />
      <RomanGames isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
