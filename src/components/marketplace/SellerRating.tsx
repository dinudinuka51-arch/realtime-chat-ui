import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SellerRatingProps {
  sellerId: string;
  showCount?: boolean;
}

export const SellerRating = ({ sellerId, showCount = true }: SellerRatingProps) => {
  const [avgRating, setAvgRating] = useState<number>(0);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const fetchRatings = async () => {
      const { data, error } = await supabase
        .from('seller_ratings')
        .select('rating')
        .eq('seller_id', sellerId);

      if (error) {
        console.error('Error fetching ratings:', error);
        return;
      }

      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAvgRating(avg);
        setCount(data.length);
      }
    };

    fetchRatings();
  }, [sellerId]);

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1 text-sm">
      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      <span className="font-medium">{avgRating.toFixed(1)}</span>
      {showCount && (
        <span className="text-muted-foreground">({count})</span>
      )}
    </div>
  );
};
