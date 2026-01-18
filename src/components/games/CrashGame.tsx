import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { TrendingUp, Zap } from 'lucide-react';

interface CrashGameProps {
  balance: number;
  onWin: (amount: number) => void;
  onLose: (amount: number) => void;
}

type GameState = 'waiting' | 'running' | 'crashed' | 'cashed_out';

export const CrashGame = ({ balance, onWin, onLose }: CrashGameProps) => {
  const [betAmount, setBetAmount] = useState('100');
  const [autoCashout, setAutoCashout] = useState('2.00');
  const [multiplier, setMultiplier] = useState(1.0);
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [hasBet, setHasBet] = useState(false);
  const [crashPoint, setCrashPoint] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentBetRef = useRef(0);

  // Generate crash point with house edge
  const generateCrashPoint = (): number => {
    const houseEdge = 0.04;
    const rand = Math.random();
    if (rand < houseEdge) return 1.0;
    return Math.max(1.0, (1 / (1 - rand)) * (1 - houseEdge));
  };

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

    currentBetRef.current = bet;
    onLose(bet); // Deduct bet first
    setHasBet(true);
    setGameState('running');
    setMultiplier(1.0);
    
    const crash = generateCrashPoint();
    setCrashPoint(crash);

    const auto = parseFloat(autoCashout);
    let currentMultiplier = 1.0;

    intervalRef.current = setInterval(() => {
      currentMultiplier += 0.01 * (1 + currentMultiplier * 0.1);
      setMultiplier(parseFloat(currentMultiplier.toFixed(2)));

      // Auto cashout
      if (!isNaN(auto) && currentMultiplier >= auto && gameState === 'running') {
        cashOut(currentMultiplier);
        return;
      }

      // Crash
      if (currentMultiplier >= crash) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setMultiplier(parseFloat(crash.toFixed(2)));
        setGameState('crashed');
        setHistory(prev => [parseFloat(crash.toFixed(2)), ...prev.slice(0, 9)]);
        if (hasBet) {
          toast.error(`💥 Crashed at ${crash.toFixed(2)}x!`);
        }
        
        setTimeout(() => {
          setGameState('waiting');
          setHasBet(false);
          setMultiplier(1.0);
        }, 2000);
      }
    }, 100);
  };

  const cashOut = (mult?: number) => {
    if (gameState !== 'running' || !hasBet) return;
    
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    const cashoutMultiplier = mult || multiplier;
    const winAmount = currentBetRef.current * cashoutMultiplier;
    
    setGameState('cashed_out');
    setHistory(prev => [parseFloat(cashoutMultiplier.toFixed(2)), ...prev.slice(0, 9)]);
    onWin(winAmount);
    toast.success(`🎉 Cashed out at ${cashoutMultiplier.toFixed(2)}x! Won Rs.${winAmount.toFixed(2)}`);

    setTimeout(() => {
      setGameState('waiting');
      setHasBet(false);
      setMultiplier(1.0);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const getMultiplierColor = () => {
    if (gameState === 'crashed') return 'text-red-500';
    if (gameState === 'cashed_out') return 'text-green-500';
    if (multiplier < 1.5) return 'text-blue-400';
    if (multiplier < 2) return 'text-green-400';
    if (multiplier < 5) return 'text-yellow-400';
    if (multiplier < 10) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* History */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <span className="text-xs text-muted-foreground shrink-0">History:</span>
        {history.map((mult, i) => (
          <span
            key={i}
            className={`px-2 py-1 rounded text-xs font-bold ${
              mult < 2 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
            }`}
          >
            {mult.toFixed(2)}x
          </span>
        ))}
        {history.length === 0 && (
          <span className="text-xs text-muted-foreground">No games yet</span>
        )}
      </div>

      {/* Game Display */}
      <div className="relative h-56 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center overflow-hidden">
        {/* Background animation */}
        {gameState === 'running' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}

        {/* Rocket animation */}
        {gameState === 'running' && (
          <motion.div
            className="absolute"
            animate={{
              y: [100, -100],
              x: [0, 50, -30, 80],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <span className="text-4xl">🚀</span>
          </motion.div>
        )}

        {/* Explosion */}
        {gameState === 'crashed' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 2, 1.5] }}
            className="absolute text-6xl"
          >
            💥
          </motion.div>
        )}

        {/* Multiplier Display */}
        <div className="relative z-10 text-center">
          <motion.div
            key={multiplier}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`text-6xl font-bold ${getMultiplierColor()}`}
          >
            {multiplier.toFixed(2)}x
          </motion.div>
          <div className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-2">
            {gameState === 'waiting' && (
              <>
                <Zap className="h-4 w-4" />
                Place your bet to start
              </>
            )}
            {gameState === 'running' && (
              <>
                <TrendingUp className="h-4 w-4 animate-bounce" />
                Going up!
              </>
            )}
            {gameState === 'crashed' && 'CRASHED!'}
            {gameState === 'cashed_out' && '💰 CASHED OUT!'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Bet Amount</label>
          <Input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            disabled={gameState === 'running'}
            className="h-12 text-lg"
          />
          <div className="flex gap-2">
            {[100, 500, 1000].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setBetAmount(amount.toString())}
                disabled={gameState === 'running'}
                className="flex-1 text-xs"
              >
                {amount}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Auto Cashout</label>
          <Input
            type="number"
            step="0.1"
            value={autoCashout}
            onChange={(e) => setAutoCashout(e.target.value)}
            disabled={gameState === 'running'}
            className="h-12 text-lg"
          />
          <div className="flex gap-2">
            {[1.5, 2, 5].map((mult) => (
              <Button
                key={mult}
                variant="outline"
                size="sm"
                onClick={() => setAutoCashout(mult.toString())}
                disabled={gameState === 'running'}
                className="flex-1 text-xs"
              >
                {mult}x
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {gameState === 'waiting' && (
        <Button
          onClick={startGame}
          className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          🚀 Place Bet - Rs.{betAmount}
        </Button>
      )}

      {gameState === 'running' && hasBet && (
        <Button
          onClick={() => cashOut()}
          className="w-full h-14 text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 animate-pulse"
        >
          💰 Cash Out @ {multiplier.toFixed(2)}x
        </Button>
      )}

      {(gameState === 'crashed' || gameState === 'cashed_out') && (
        <Button
          disabled
          className="w-full h-14 text-lg font-bold opacity-50"
        >
          {gameState === 'crashed' ? '💥 Game Crashed' : '✅ Cashed Out Successfully'}
        </Button>
      )}
    </div>
  );
};
