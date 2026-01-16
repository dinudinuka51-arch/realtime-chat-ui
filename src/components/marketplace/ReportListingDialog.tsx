import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const REPORT_REASONS = [
  { value: 'fake', label: 'Fake/Scam Listing' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'stolen', label: 'Stolen Item' },
  { value: 'duplicate', label: 'Duplicate Listing' },
  { value: 'wrong_category', label: 'Wrong Category' },
  { value: 'other', label: 'Other' },
];

interface ReportListingDialogProps {
  listingId: string;
  listingTitle: string;
}

export const ReportListingDialog = ({ listingId, listingTitle }: ReportListingDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) {
      toast.error('කරුණාකර හේතුවක් තෝරන්න');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('listing_reports')
        .insert({
          listing_id: listingId,
          reporter_id: user.id,
          reason,
          description: description || null,
        });

      if (error) throw error;

      toast.success('Report එක submit කළා!');
      setOpen(false);
      setReason('');
      setDescription('');
    } catch (err) {
      console.error('Error submitting report:', err);
      toast.error('Report submit කිරීම අසාර්ථකයි');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
          <Flag className="w-4 h-4" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            Report Listing
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          "{listingTitle}" report කරන්න
        </p>

        <div className="space-y-4 mt-4">
          <div>
            <Label>හේතුව</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="හේතුවක් තෝරන්න" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="report-desc">විස්තරය (Optional)</Label>
            <Textarea
              id="report-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="වැඩි විස්තර ලියන්න..."
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading || !reason} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
