import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { ShopifyProduct, useCartStore } from '@/stores/cartStore';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: ShopifyProduct;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const addItem = useCartStore(state => state.addItem);
  const { node } = product;
  const firstVariant = node.variants.edges[0]?.node;
  const firstImage = node.images.edges[0]?.node;
  const price = node.priceRange.minVariantPrice;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!firstVariant) return;

    addItem({
      product,
      variantId: firstVariant.id,
      variantTitle: firstVariant.title,
      price: firstVariant.price,
      quantity: 1,
      selectedOptions: firstVariant.selectedOptions || [],
    });
  };

  return (
    <Link to={`/product/${node.handle}`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/30">
        <div className="aspect-square relative overflow-hidden bg-muted">
          {firstImage ? (
            <img
              src={firstImage.url}
              alt={firstImage.altText || node.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
          <Button
            size="icon"
            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            onClick={handleAddToCart}
            disabled={!firstVariant?.availableForSale}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {node.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
            {node.description || 'No description available'}
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-lg font-bold text-primary">
              {price.currencyCode} {parseFloat(price.amount).toFixed(2)}
            </span>
            {!firstVariant?.availableForSale && (
              <span className="text-xs text-destructive">Out of stock</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
