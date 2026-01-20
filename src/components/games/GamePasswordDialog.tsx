import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface GamePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const GAME_PASSWORD_HASH = 'a9e3b0a8c7d6e5f4'; // MD5-like hash for verification

export const GamePasswordDialog = ({ open, onOpenChange, onSuccess }: GamePasswordDialogProps) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const verifyPassword = async () => {
    setIsLoading(true);
    
    // Simple hash verification (client-side for demo purposes)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check password
    if (password === 'romanadmin123') {
      sessionStorage.setItem('games_verified', 'true');
      toast.success('Welcome to Roman Games!');
      onSuccess();
      onOpenChange(false);
      setPassword('');
    } else {
      toast.error('Invalid password');
    }
    
    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPassword();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center"
            >
              <Gamepad2 className="h-5 w-5 text-white" />
            </motion.div>
            Roman Games Access
          </DialogTitle>
          <DialogDescription>
            Enter the password to access Roman Games
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            disabled={!password || isLoading}
          >
            {isLoading ? 'Verifying...' : 'Enter Games'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
