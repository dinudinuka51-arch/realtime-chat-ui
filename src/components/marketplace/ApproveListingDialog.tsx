import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, Loader2 } from 'lucide-react';

interface ApproveListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
  onApproved: () => void;
}

// The approval password - any user can approve with this password
const APPROVAL_PASSWORD = 'romanadmin123';

export const ApproveListingDialog = ({
  open,
  onOpenChange,
  listingId,
  listingTitle,
  onApproved,
}: ApproveListingDialogProps) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    setError('');
    setLoading(true);

    try {
      // Simple password comparison
      if (password !== APPROVAL_PASSWORD) {
        setError('Incorrect password');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('marketplace_listings')
        .update({ status: 'approved' })
        .eq('id', listingId);

      if (updateError) throw updateError;

      toast.success('Listing approved successfully!');
      setPassword('');
      onApproved();
      onOpenChange(false);
    } catch (err) {
      console.error('Error approving listing:', err);
      toast.error('Failed to approve listing');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            Approve Listing
          </DialogTitle>
          <DialogDescription>
            Enter the approval password to approve "{listingTitle}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="approval-password">Password</Label>
            <Input
              id="approval-password"
              type="password"
              placeholder="Enter approval password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password) {
                  handleApprove();
                }
              }}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={loading || !password}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
