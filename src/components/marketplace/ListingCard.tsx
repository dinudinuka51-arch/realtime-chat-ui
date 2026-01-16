import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MessageCircle, ShoppingCart, Heart, MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { SellerRating } from './SellerRating';
import { RatingDialog } from './RatingDialog';
import { ReportListingDialog } from './ReportListingDialog';
import { useAuth } from '@/hooks/useAuth';

interface ListingCardProps {
  listing: {
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
    profile?: {
      username: string;
      avatar_url: string | null;
    };
  };
  onContact?: () => void;
  onBuy?: () => void;
  showStatus?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  electronics: 'Electronics',
  clothing: 'Clothing',
  home: 'Home & Garden',
  vehicles: 'Vehicles',
  services: 'Services',
  jobs: 'Jobs',
  other: 'Other',
};

export const ListingCard = ({ 
  listing, 
  onContact, 
  onBuy, 
  showStatus,
  isFavorite,
  onToggleFavorite 
}: ListingCardProps) => {
  const { user } = useAuth();
  const mainImage = listing.images?.[0] || '/placeholder.svg';
  const imageCount = listing.images?.length || 0;

  // Calculate days until expiry
  const daysUntilExpiry = listing.expires_at 
    ? differenceInDays(new Date(listing.expires_at), new Date()) 
    : null;

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  const isOwner = user?.id === listing.user_id;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="relative aspect-square">
        <img
          src={mainImage}
          alt={listing.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Image count badge */}
        {imageCount > 1 && (
          <Badge className="absolute bottom-2 left-2 bg-black/60 text-white text-xs">
            1/{imageCount}
          </Badge>
        )}
        
        {listing.is_featured && (
          <Badge className="absolute top-2 left-2 bg-yellow-500">Featured</Badge>
        )}
        
        {showStatus && (
          <Badge 
            className="absolute top-2 right-2"
            variant={listing.status === 'approved' ? 'default' : listing.status === 'pending' ? 'secondary' : 'destructive'}
          >
            {listing.status}
          </Badge>
        )}

        {/* Expiry warning */}
        {isExpiringSoon && !showStatus && (
          <Badge className="absolute top-2 right-2 bg-orange-500 text-white">
            <Clock className="w-3 h-3 mr-1" />
            {daysUntilExpiry}d left
          </Badge>
        )}

        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
            style={{ display: showStatus ? 'none' : 'block' }}
          >
            <Heart 
              className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
            />
          </button>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-1">{listing.title}</h3>
          <span className="text-lg font-bold text-primary whitespace-nowrap">
            ${listing.price.toFixed(2)}
          </span>
        </div>
        
        {listing.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {listing.description}
          </p>
        )}

        {/* Location */}
        {listing.location && (
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{listing.location}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {CATEGORY_LABELS[listing.category] || listing.category}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {listing.views_count}
          </span>
          <SellerRating sellerId={listing.user_id} />
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
        </p>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 gap-2 flex-wrap">
        {onContact && (
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={onContact}>
            <MessageCircle className="w-4 h-4" />
            Contact
          </Button>
        )}
        {onBuy && (
          <Button size="sm" className="flex-1 gap-1" onClick={onBuy}>
            <ShoppingCart className="w-4 h-4" />
            Buy Now
          </Button>
        )}
        
        {/* Rating and Report - only for non-owners */}
        {!isOwner && listing.status === 'approved' && (
          <div className="flex gap-1 w-full mt-2">
            <RatingDialog 
              sellerId={listing.user_id} 
              listingId={listing.id}
            />
            <ReportListingDialog 
              listingId={listing.id} 
              listingTitle={listing.title}
            />
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
