import { useState, useEffect } from 'react';
import { cartAPI, ordersAPI, productsAPI, authAPI } from '../api';
import type { CartItem, Product, OrderData } from '../api';

const Cart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const cart = cartAPI.getCart();
      setCartItems(cart);

      if (cart.length > 0) {
        // Fetch product details for cart items
        const productIds = cart.map(item => item.productId);
        const allProducts = await productsAPI.getProducts({ limit: 100 });
                const cartProducts = allProducts.items.filter((product: any) =>
          productIds.includes(product.id)
        );
        setProducts(cartProducts);
      }
    } catch (err) {
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (productId: number, quantity: number) => {
    cartAPI.updateCartItem(productId, quantity);
    loadCart(); // Reload cart to reflect changes
  };

  const removeItem = (productId: number) => {
    cartAPI.removeFromCart(productId);
    loadCart(); // Reload cart to reflect changes
  };

  const getProductById = (productId: number): Product | undefined => {
    return products.find(p => p.id === productId);
  };

  const getCartTotal = (): number => {
    return cartItems.reduce((total, item) => {
      const product = getProductById(item.productId);
      if (product) {
        return total + (parseFloat(product.price) * item.quantity);
      }
      return total;
    }, 0);
  };

  const handleCheckout = async () => {
    if (!shippingAddress.trim()) {
      setError('Please enter a shipping address');
      return;
    }

    if (!authAPI.isAuthenticated()) {
      setError('Please log in to place an order');
      return;
    }

    try {
      setCheckoutLoading(true);
      setError(null);
      setSuccess(null);

      const orderData: OrderData = {
        items: cartItems,
        shippingAddress: shippingAddress.trim(),
      };

      const order = await ordersAPI.placeOrder(orderData);
      
      setSuccess(`Order placed successfully! Order ID: ${order.id}`);
      
      // Clear cart after successful order
      cartAPI.clearCart();
      setCartItems([]);
      setProducts([]);
      setShippingAddress('');
      
      // Redirect to home page after a delay
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading cart...</div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Cart</h1>
            <p className="text-gray-600 mb-8">Your cart is empty</p>
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Continue Shopping
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Cart Items</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {cartItems.map((item) => {
                  const product = getProductById(item.productId);
                  if (!product) return null;

                  return (
                    <div key={item.productId} className="px-6 py-4 flex items-center space-x-4">
                      <div className="flex-shrink-0 w-16 h-16">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No image</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {product.description}
                        </p>
                        <p className="text-sm font-medium text-green-600">
                          ${parseFloat(product.price).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        >
                          -
                        </button>
                        <span className="w-12 text-center text-sm text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          ${(parseFloat(product.price) * item.quantity).toFixed(2)}
                        </p>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Checkout Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg sticky top-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Checkout Summary</h2>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                  <span className="font-medium">${getCartTotal().toFixed(2)}</span>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-lg font-medium">
                    <span>Total</span>
                    <span>${getCartTotal().toFixed(2)}</span>
                  </div>
                </div>

                {!authAPI.isAuthenticated() && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md text-sm">
                    Please <a href="/login" className="underline">log in</a> to place an order
                  </div>
                )}

                {authAPI.isAuthenticated() && (
                  <>
                    <div>
                      <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700 mb-2">
                        Shipping Address
                      </label>
                      <textarea
                        id="shippingAddress"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your shipping address"
                        required
                      />
                    </div>

                    <button
                      onClick={handleCheckout}
                      disabled={checkoutLoading || !shippingAddress.trim()}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checkoutLoading ? 'Placing Order...' : 'Place Order'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
