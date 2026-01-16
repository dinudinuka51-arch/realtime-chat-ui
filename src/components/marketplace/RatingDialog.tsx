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
import { Star, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface RatingDialogProps {
  sellerId: string;
  listingId: string;
  sellerName?: string;
  onRated?: () => void;
}

export const RatingDialog = ({ sellerId, listingId, sellerName, onRated }: RatingDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error('කරුණාකර rating එකක් තෝරන්න');
      return;
    }

    if (user.id === sellerId) {
      toast.error('ඔබට ඔබගේම listing එකට rate කළ නොහැක');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('seller_ratings')
        .upsert({
          seller_id: sellerId,
          rater_id: user.id,
          listing_id: listingId,
          rating,
          review: review || null,
        }, { onConflict: 'rater_id,listing_id' });

      if (error) throw error;

      toast.success('Rating එක submit කළා!');
      setOpen(false);
      setRating(0);
      setReview('');
      onRated?.();
    } catch (err) {
      console.error('Error submitting rating:', err);
      toast.error('Rating submit කිරීම අසාර්ථකයි');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Star className="w-4 h-4" />
          Rate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rate {sellerName || 'Seller'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Rating</Label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="review">Review (Optional)</Label>
            <Textarea
              id="review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="ඔබේ අත්දැකීම ගැන ලියන්න..."
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading || rating === 0} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Rating
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
