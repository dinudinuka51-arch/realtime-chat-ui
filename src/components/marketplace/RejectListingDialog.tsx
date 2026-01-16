import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const REJECTION_PASSWORD = 'romanadmin123';

interface RejectListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
  onRejected: () => void;
}

export const RejectListingDialog = ({
  open,
  onOpenChange,
  listingId,
  listingTitle,
  onRejected,
}: RejectListingDialogProps) => {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReject = async () => {
    setError('');

    if (password !== REJECTION_PASSWORD) {
      setError('Password එක වැරදියි');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('marketplace_listings')
        .update({ status: 'rejected' })
        .eq('id', listingId);

      if (updateError) throw updateError;

      toast.success('Listing rejected කළා!');
      onRejected();
      handleClose();
    } catch (err) {
      console.error('Error rejecting listing:', err);
      toast.error('Reject කිරීම අසාර්ථකයි');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setReason('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
            Reject Listing
          </DialogTitle>
          <DialogDescription>
            "{listingTitle}" reject කරන්න password ඇතුළත් කරන්න
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="reject-reason">හේතුව (Optional)</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reject කරන හේතුව..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="reject-password">Password</Label>
            <Input
              id="reject-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Password ඇතුළත් කරන්න"
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || !password}
              className="flex-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
