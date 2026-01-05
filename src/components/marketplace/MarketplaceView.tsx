import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, ArrowLeft, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ListingCard } from './ListingCard';
import { CreateListingDialog } from './CreateListingDialog';
import { toast } from 'sonner';

interface MarketplaceViewProps {
  onBack: () => void;
}

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  images: string[];
  status: string;
  is_featured: boolean;
  views_count: number;
  created_at: string;
  user_id: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing & Fashion' },
  { value: 'home', label: 'Home & Garden' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'services', label: 'Services' },
  { value: 'jobs', label: 'Jobs' },
  { value: 'other', label: 'Other' },
];

export const MarketplaceView = ({ onBack }: MarketplaceViewProps) => {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    fetchListings();
    if (user) fetchMyListings();

    const channel = supabase
      .channel('marketplace_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketplace_listings' },
        () => {
          fetchListings();
          if (user) fetchMyListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchListings = async () => {
    try {
      let query = supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'approved')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyListings(data || []);
    } catch (error) {
      console.error('Error fetching my listings:', error);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [searchQuery, category]);

  const handleContact = (listing: Listing) => {
    toast.info(`Contact seller for: ${listing.title}`);
  };

  const handleBuy = (listing: Listing) => {
    toast.info(`Purchase flow for: ${listing.title} - $${listing.price}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">Marketplace</h1>
            </div>
          </div>
          {user && <CreateListingDialog onListingCreated={fetchMyListings} />}
        </div>

        {/* Search & Filter */}
        <div className="px-4 pb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="w-full justify-start px-4 bg-transparent border-b rounded-none">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          {user && <TabsTrigger value="my-listings">My Listings</TabsTrigger>}
        </TabsList>

        <TabsContent value="browse" className="p-4">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No listings found</h3>
              <p className="text-muted-foreground">Be the first to sell something!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onContact={() => handleContact(listing)}
                  onBuy={() => handleBuy(listing)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-listings" className="p-4">
          {myListings.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No listings yet</h3>
              <p className="text-muted-foreground">Start selling by creating your first listing!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {myListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  showStatus
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
