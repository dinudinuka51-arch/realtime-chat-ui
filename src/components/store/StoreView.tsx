import { useState, useEffect } from 'react';
import { ArrowLeft, Store, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ProductCard } from './ProductCard';
import { CartDrawer } from './CartDrawer';
import { ShopifyProduct } from '@/stores/cartStore';
import { toast } from 'sonner';
import romanLogo from '@/assets/roman-logo.png';

const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'instant-react-bliss-gdp6h.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = 'fc5d2d5d5722ea4c1319693eef76d78b';

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          description
          handle
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          options {
            name
            values
          }
        }
      }
    }
  }
`;

interface StoreViewProps {
  onBack: () => void;
}

export const StoreView = ({ onBack }: StoreViewProps) => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async (query?: string) => {
    setLoading(true);
    try {
      const response = await fetch(SHOPIFY_STOREFRONT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
        },
        body: JSON.stringify({
          query: PRODUCTS_QUERY,
          variables: { first: 50, query: query || null },
        }),
      });

      if (response.status === 402) {
        toast.error("Shopify: Payment required");
        return;
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(data.errors.map((e: { message: string }) => e.message).join(', '));
      }

      setProducts(data.data.products.edges);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(searchQuery ? `title:*${searchQuery}*` : undefined);
  };

  return (
    <div className="flex flex-col h-full bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={romanLogo} alt="Roman" className="h-8 w-8 rounded-lg" />
          <div>
            <h1 className="text-xl font-bold">Roman Store</h1>
            <p className="text-xs text-muted-foreground">Shop the latest products</p>
          </div>
        </div>
        <CartDrawer />
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 text-center">
          <Store className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h2 className="text-3xl font-bold mb-2">Welcome to Roman Store</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Discover amazing products curated just for you. Fast shipping, great prices, and excellent customer service.
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </div>

        {/* Products Grid */}
        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-square bg-muted animate-pulse" />
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-5 bg-muted rounded animate-pulse w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No products yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                The store is being set up. Check back soon for amazing products, or ask to add products!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
