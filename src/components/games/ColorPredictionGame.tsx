import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ColorPredictionGameProps {
  balance: number;
  onWin: (amount: number) => void;
  onLose: (amount: number) => void;
}

type ColorChoice = 'red' | 'green' | null;

export const ColorPredictionGame = ({ balance, onWin, onLose }: ColorPredictionGameProps) => {
  const [betAmount, setBetAmount] = useState('100');
  const [selectedColor, setSelectedColor] = useState<ColorChoice>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<ColorChoice>(null);
  const [countdown, setCountdown] = useState(0);
  const [history, setHistory] = useState<ColorChoice[]>([]);

  const startGame = () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) {
      toast.error('Invalid bet amount');
      return;
    }
    if (bet > balance) {
      toast.error('Insufficient balance');
      return;
    }
    if (!selectedColor) {
      toast.error('Please select a color');
      return;
    }

    setIsSpinning(true);
    setResult(null);
    setCountdown(3);

    // Countdown
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Determine result after countdown
    setTimeout(() => {
      const randomResult: ColorChoice = Math.random() > 0.5 ? 'red' : 'green';
      setResult(randomResult);
      setHistory(prev => [randomResult, ...prev.slice(0, 9)]);
      setIsSpinning(false);

      if (randomResult === selectedColor) {
        const winAmount = bet * 1.9;
        onWin(winAmount);
        toast.success(`🎉 You won Rs.${winAmount.toFixed(2)}!`);
      } else {
        onLose(bet);
        toast.error(`😢 You lost Rs.${bet.toFixed(2)}`);
      }
      setSelectedColor(null);
    }, 3500);
  };

  return (
    <div className="space-y-6">
      {/* History */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <span className="text-xs text-muted-foreground shrink-0">History:</span>
        {history.map((color, i) => (
          <div
            key={i}
            className={`w-6 h-6 rounded-full shrink-0 ${
              color === 'red' ? 'bg-red-500' : 'bg-green-500'
            }`}
          />
        ))}
        {history.length === 0 && (
          <span className="text-xs text-muted-foreground">No games yet</span>
        )}
      </div>

      {/* Game Area */}
      <div className="relative h-48 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {isSpinning ? (
            <motion.div
              key="spinning"
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              {countdown > 0 ? (
                <motion.span
                  key={countdown}
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="text-6xl font-bold text-white"
                >
                  {countdown}
                </motion.span>
              ) : (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
                  className="w-20 h-20 rounded-full border-4 border-t-red-500 border-r-green-500 border-b-red-500 border-l-green-500"
                />
              )}
            </motion.div>
          ) : result ? (
            <motion.div
              key="result"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className={`w-32 h-32 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-2xl ${
                result === 'red' 
                  ? 'bg-gradient-to-br from-red-400 to-red-600' 
                  : 'bg-gradient-to-br from-green-400 to-green-600'
              }`}
            >
              {result.toUpperCase()}
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="text-4xl mb-2">🎰</div>
              <p className="text-muted-foreground">Select a color & place your bet</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Color Selection */}
      <div className="grid grid-cols-2 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => !isSpinning && setSelectedColor('red')}
          disabled={isSpinning}
          className={`h-20 rounded-xl font-bold text-xl text-white transition-all ${
            selectedColor === 'red'
              ? 'bg-gradient-to-br from-red-500 to-red-700 ring-4 ring-red-400 ring-offset-2 ring-offset-background'
              : 'bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700'
          } ${isSpinning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          🔴 RED
          <div className="text-xs font-normal opacity-80">1.9x Payout</div>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => !isSpinning && setSelectedColor('green')}
          disabled={isSpinning}
          className={`h-20 rounded-xl font-bold text-xl text-white transition-all ${
            selectedColor === 'green'
              ? 'bg-gradient-to-br from-green-500 to-green-700 ring-4 ring-green-400 ring-offset-2 ring-offset-background'
              : 'bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700'
          } ${isSpinning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          🟢 GREEN
          <div className="text-xs font-normal opacity-80">1.9x Payout</div>
        </motion.button>
      </div>

      {/* Bet Controls */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="Bet amount"
            disabled={isSpinning}
            className="h-12 text-lg"
          />
        </div>
        <div className="flex gap-2">
          {[100, 500, 1000].map((amount) => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(amount.toString())}
              disabled={isSpinning}
              className="h-12"
            >
              {amount}
            </Button>
          ))}
        </div>
      </div>

      <Button
        onClick={startGame}
        disabled={isSpinning || !selectedColor}
        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-accent"
      >
        {isSpinning ? 'Game in Progress...' : `Place Bet - Rs.${betAmount}`}
      </Button>
    </div>
  );
};
