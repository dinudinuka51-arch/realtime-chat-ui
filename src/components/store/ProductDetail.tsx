import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CartDrawer } from './CartDrawer';
import { ShopifyProduct, useCartStore } from '@/stores/cartStore';
import { toast } from 'sonner';
import romanLogo from '@/assets/roman-logo.png';

const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'instant-react-bliss-gdp6h.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = 'fc5d2d5d5722ea4c1319693eef76d78b';

const PRODUCT_QUERY = `
  query GetProduct($handle: String!) {
    productByHandle(handle: $handle) {
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
      images(first: 10) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 20) {
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
`;

export const ProductDetail = () => {
  const { handle } = useParams();
  const navigate = useNavigate();
  const addItem = useCartStore(state => state.addItem);
  
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (handle) {
      fetchProduct(handle);
    }
  }, [handle]);

  const fetchProduct = async (productHandle: string) => {
    setLoading(true);
    try {
      const response = await fetch(SHOPIFY_STOREFRONT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
        },
        body: JSON.stringify({
          query: PRODUCT_QUERY,
          variables: { handle: productHandle },
        }),
      });

      const data = await response.json();
      
      if (data.data?.productByHandle) {
        const productData: ShopifyProduct = { node: data.data.productByHandle };
        setProduct(productData);
        
        // Set default variant
        const firstVariant = productData.node.variants.edges[0]?.node;
        if (firstVariant) {
          setSelectedVariant(firstVariant.id);
          const options: Record<string, string> = {};
          firstVariant.selectedOptions?.forEach(opt => {
            options[opt.name] = opt.value;
          });
          setSelectedOptions(options);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (optionName: string, value: string) => {
    const newOptions = { ...selectedOptions, [optionName]: value };
    setSelectedOptions(newOptions);

    // Find matching variant
    const variant = product?.node.variants.edges.find(v => {
      return v.node.selectedOptions?.every(
        opt => newOptions[opt.name] === opt.value
      );
    });

    if (variant) {
      setSelectedVariant(variant.node.id);
    }
  };

  const getCurrentVariant = () => {
    return product?.node.variants.edges.find(v => v.node.id === selectedVariant)?.node;
  };

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;

    const variant = getCurrentVariant();
    if (!variant) return;

    addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <h2 className="text-xl font-semibold mb-2">Product not found</h2>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const { node } = product;
  const currentVariant = getCurrentVariant();
  const images = node.images.edges;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={romanLogo} alt="Roman" className="h-8 w-8 rounded-lg" />
          <span className="font-semibold">Product Details</span>
        </div>
        <CartDrawer />
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
              {images[selectedImage]?.node && (
                <img
                  src={images[selectedImage].node.url}
                  alt={images[selectedImage].node.altText || node.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                      selectedImage === index ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={img.node.url}
                      alt={img.node.altText || `${node.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{node.title}</h1>
              <p className="text-2xl font-bold text-primary">
                {currentVariant?.price.currencyCode} {parseFloat(currentVariant?.price.amount || '0').toFixed(2)}
              </p>
            </div>

            {/* Options */}
            {node.options.map((option) => (
              <div key={option.name}>
                <h3 className="font-semibold mb-2">{option.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => (
                    <Button
                      key={value}
                      variant={selectedOptions[option.name] === value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleOptionChange(option.name, value)}
                    >
                      {selectedOptions[option.name] === value && (
                        <Check className="h-3 w-3 mr-1" />
                      )}
                      {value}
                    </Button>
                  ))}
                </div>
              </div>
            ))}

            {/* Availability */}
            <div>
              {currentVariant?.availableForSale ? (
                <Badge variant="default" className="bg-green-500">In Stock</Badge>
              ) : (
                <Badge variant="destructive">Out of Stock</Badge>
              )}
            </div>

            {/* Add to Cart */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleAddToCart}
              disabled={!currentVariant?.availableForSale}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>

            {/* Description */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {node.description || 'No description available.'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
