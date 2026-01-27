import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, Wallet, Lock, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Profile {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface BalanceUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateBalance: (userId: string, newBalance: number) => Promise<any>;
}

export const BalanceUpdateDialog = ({ open, onOpenChange, onUpdateBalance }: BalanceUpdateDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [newBalance, setNewBalance] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [step, setStep] = useState<'search' | 'update'>('search');

  useEffect(() => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      setSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .limit(10);

      setUsers((data || []) as Profile[]);
      setSearching(false);
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelectUser = async (user: Profile) => {
    setSelectedUser(user);
    
    // Fetch current balance
    const { data } = await supabase
      .from('micro_balances')
      .select('balance_lkr')
      .eq('user_id', user.user_id)
      .maybeSingle();

    setCurrentBalance((data?.balance_lkr as number) || 0);
    setNewBalance(String((data?.balance_lkr as number) || 0));
    setStep('update');
  };

  const handleUpdate = async () => {
    if (password !== 'romanadmin123') {
      toast.error('Incorrect password');
      return;
    }

    if (!selectedUser) return;

    setLoading(true);
    const result = await onUpdateBalance(selectedUser.user_id, parseFloat(newBalance) || 0);
    setLoading(false);

    if (!result.error) {
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setUsers([]);
    setSelectedUser(null);
    setNewBalance('');
    setPassword('');
    setStep('search');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Update User Balance
          </DialogTitle>
        </DialogHeader>

        {step === 'search' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {searching && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Searching...
              </div>
            )}

            {users.length > 0 && (
              <ScrollArea className="h-60">
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.user_id}
                      onClick={() => handleSelectUser(user)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{user.full_name || user.username}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {searchQuery && !searching && users.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No users found
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {selectedUser && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser.full_name || selectedUser.username}</p>
                  <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                LKR {currentBalance.toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newBalance">New Balance (LKR)</Label>
              <Input
                id="newBalance"
                type="number"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Admin Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password to confirm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep('search')} 
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleUpdate} 
                disabled={loading || !password} 
                className="flex-1 gap-2"
              >
                <Check className="h-4 w-4" />
                {loading ? 'Updating...' : 'Update Balance'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
