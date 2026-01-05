import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, MessageCircle, ShoppingCart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
    profile?: {
      username: string;
      avatar_url: string | null;
    };
  };
  onContact?: () => void;
  onBuy?: () => void;
  showStatus?: boolean;
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

export const ListingCard = ({ listing, onContact, onBuy, showStatus }: ListingCardProps) => {
  const mainImage = listing.images?.[0] || '/placeholder.svg';

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-square">
        <img
          src={mainImage}
          alt={listing.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
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
        
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="text-xs">
            {CATEGORY_LABELS[listing.category] || listing.category}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {listing.views_count}
          </span>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
        </p>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 gap-2">
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
      </CardFooter>
    </Card>
  );
};
