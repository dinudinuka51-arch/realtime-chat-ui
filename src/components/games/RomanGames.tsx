import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, RefreshCw, Gamepad2, TrendingUp, Circle } from 'lucide-react';
import { useGameWallet } from './useGameWallet';
import { ColorPredictionGame } from './ColorPredictionGame';
import { CrashGame } from './CrashGame';

interface RomanGamesProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RomanGames = ({ isOpen, onClose }: RomanGamesProps) => {
  const { balance, addBalance, deductBalance, resetBalance } = useGameWallet();
  const [activeGame, setActiveGame] = useState<'color' | 'crash'>('color');

  const handleWin = (amount: number) => {
    addBalance(amount);
  };

  const handleLose = (amount: number) => {
    deductBalance(amount);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Game Panel */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 h-[85vh] bg-background rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Gamepad2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Roman Games</h2>
                  <p className="text-xs text-muted-foreground">Demo Mode • Play for fun!</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Wallet Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Balance:</span>
                <motion.span
                  key={balance}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="font-bold text-lg"
                >
                  Rs.{balance.toLocaleString()}
                </motion.span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetBalance}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
            </div>

            {/* Game Tabs */}
            <Tabs value={activeGame} onValueChange={(v) => setActiveGame(v as 'color' | 'crash')} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid grid-cols-2 mx-4 mt-4">
                <TabsTrigger value="color" className="gap-2">
                  <Circle className="h-4 w-4" />
                  Color Prediction
                </TabsTrigger>
                <TabsTrigger value="crash" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Crash
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-4">
                <TabsContent value="color" className="mt-0">
                  <ColorPredictionGame
                    balance={balance}
                    onWin={handleWin}
                    onLose={handleLose}
                  />
                </TabsContent>

                <TabsContent value="crash" className="mt-0">
                  <CrashGame
                    balance={balance}
                    onWin={handleWin}
                    onLose={handleLose}
                  />
                </TabsContent>
              </div>
            </Tabs>

            {/* Disclaimer */}
            <div className="p-3 text-center text-xs text-muted-foreground bg-muted/30 border-t border-border">
              ⚠️ This is a demo game with virtual currency. No real money involved.
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
