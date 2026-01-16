import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, ArrowLeft, Package, Clock, CheckCircle, XCircle, Heart, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ListingCard } from './ListingCard';
import { CreateListingDialog } from './CreateListingDialog';
import { ApproveListingDialog } from './ApproveListingDialog';
import { RejectListingDialog } from './RejectListingDialog';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useFavorites } from '@/hooks/useFavorites';

interface MarketplaceViewProps {
  onBack: () => void;
  onOpenChat?: (conversationId: string) => void;
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
  location?: string | null;
  expires_at?: string | null;
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

const LOCATIONS = [
  { value: 'all', label: 'All Locations' },
  { value: 'colombo', label: 'Colombo' },
  { value: 'kandy', label: 'Kandy' },
  { value: 'galle', label: 'Galle' },
  { value: 'jaffna', label: 'Jaffna' },
  { value: 'negombo', label: 'Negombo' },
  { value: 'anuradhapura', label: 'Anuradhapura' },
  { value: 'other', label: 'Other' },
];

export const MarketplaceView = ({ onBack, onOpenChat }: MarketplaceViewProps) => {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('all');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const { favorites, toggleFavorite, isFavorite, fetchFavorites } = useFavorites();

  useEffect(() => {
    fetchListings();
    fetchPendingListings();
    if (user) {
      fetchMyListings();
    }

    const channel = supabase
      .channel('marketplace_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketplace_listings' },
        () => {
          fetchListings();
          fetchPendingListings();
          if (user) fetchMyListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch favorite listings when favorites change
  useEffect(() => {
    if (favorites.length > 0) {
      fetchFavoriteListings();
    } else {
      setFavoriteListings([]);
    }
  }, [favorites]);

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

      if (location !== 'all') {
        query = query.ilike('location', `%${location}%`);
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

  const fetchPendingListings = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingListings(data || []);
    } catch (error) {
      console.error('Error fetching pending listings:', error);
    }
  };

  const fetchFavoriteListings = async () => {
    if (favorites.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .in('id', favorites)
        .eq('status', 'approved');

      if (error) throw error;
      setFavoriteListings(data || []);
    } catch (error) {
      console.error('Error fetching favorite listings:', error);
    }
  };

  const handleApproveClick = (listing: Listing) => {
    setSelectedListing(listing);
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (listing: Listing) => {
    setSelectedListing(listing);
    setRejectDialogOpen(true);
  };

  const handleApproved = () => {
    fetchListings();
    fetchPendingListings();
  };

  const handleRejected = () => {
    fetchPendingListings();
  };

  useEffect(() => {
    fetchListings();
  }, [searchQuery, category, location]);

  const handleContact = async (listing: Listing) => {
    if (!user) {
      toast.error('Please login to contact seller');
      return;
    }

    if (listing.user_id === user.id) {
      toast.info('This is your own listing');
      return;
    }

    try {
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      const myConvIds = myConvs?.map((c) => c.conversation_id) ?? [];

      if (myConvIds.length > 0) {
        const { data: matches } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .in('conversation_id', myConvIds)
          .eq('user_id', listing.user_id)
          .limit(1);

        if (matches?.[0]?.conversation_id) {
          onOpenChat?.(matches[0].conversation_id);
          onBack();
          return;
        }
      }

      const conversationId = crypto.randomUUID();

      await supabase
        .from('conversations')
        .insert({ id: conversationId });

      await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: conversationId, user_id: user.id },
          { conversation_id: conversationId, user_id: listing.user_id },
        ]);

      toast.success('Chat started with seller!');
      onOpenChat?.(conversationId);
      onBack();
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
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

        {/* Search & Filters */}
        <div className="px-4 pb-4 space-y-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="flex-1">
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
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="flex-1">
                <MapPin className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="w-full justify-start px-4 bg-transparent border-b rounded-none overflow-x-auto">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Pending
            {pendingListings.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {pendingListings.length}
              </Badge>
            )}
          </TabsTrigger>
          {user && (
            <TabsTrigger value="favorites" className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              Favorites
              {favorites.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {favorites.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
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
                  isFavorite={isFavorite(listing.id)}
                  onToggleFavorite={() => toggleFavorite(listing.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="p-4">
          {pendingListings.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No pending listings</h3>
              <p className="text-muted-foreground">All listings have been reviewed!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pendingListings.map((listing) => (
                <div key={listing.id} className="relative">
                  <ListingCard listing={listing} showStatus />
                  <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApproveClick(listing)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleRejectClick(listing)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="p-4">
          {favoriteListings.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No favorites yet</h3>
              <p className="text-muted-foreground">Save listings you like to see them here!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {favoriteListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onContact={() => handleContact(listing)}
                  onBuy={() => handleBuy(listing)}
                  isFavorite={true}
                  onToggleFavorite={() => toggleFavorite(listing.id)}
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

      {/* Approve Dialog */}
      {selectedListing && (
        <ApproveListingDialog
          open={approveDialogOpen}
          onOpenChange={setApproveDialogOpen}
          listingId={selectedListing.id}
          listingTitle={selectedListing.title}
          onApproved={handleApproved}
        />
      )}

      {/* Reject Dialog */}
      {selectedListing && (
        <RejectListingDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          listingId={selectedListing.id}
          listingTitle={selectedListing.title}
          onRejected={handleRejected}
        />
      )}
    </div>
  );
};
