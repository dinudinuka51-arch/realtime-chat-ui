import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('listing_favorites')
        .select('listing_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setFavorites(data?.map((f) => f.listing_id) || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = async (listingId: string) => {
    if (!user) {
      toast.error('Favorites එකතු කරන්න login වෙන්න');
      return;
    }

    setLoading(true);
    const isFavorite = favorites.includes(listingId);

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('listing_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);

        if (error) throw error;
        setFavorites(favorites.filter((id) => id !== listingId));
        toast.success('Favorites වලින් ඉවත් කළා');
      } else {
        const { error } = await supabase
          .from('listing_favorites')
          .insert({ user_id: user.id, listing_id: listingId });

        if (error) throw error;
        setFavorites([...favorites, listingId]);
        toast.success('Favorites වලට එකතු කළා');
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isFavorite = (listingId: string) => favorites.includes(listingId);

  return { favorites, toggleFavorite, isFavorite, loading, fetchFavorites };
};
