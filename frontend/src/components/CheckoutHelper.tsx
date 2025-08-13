import { useState } from 'react';
import { cartAPI, ordersAPI, authAPI } from '../api';
import type { OrderData } from '../api';

interface CheckoutHelperProps {
  onOrderPlaced?: (orderId: number) => void;
  className?: string;
}

const CheckoutHelper = ({ onOrderPlaced, className = '' }: CheckoutHelperProps) => {
  const [shippingAddress, setShippingAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const cartItems = cartAPI.getCart();
  const isAuthenticated = authAPI.isAuthenticated();

  const handleQuickCheckout = async () => {
    if (!isAuthenticated) {
      setError('Please log in to place an order');
      return;
    }

    if (!shippingAddress.trim()) {
      setError('Please enter a shipping address');
      return;
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    try {
      setLoading(true);
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
      
      // Notify parent component
      if (onOrderPlaced) {
        onOrderPlaced(order.id);
      }
      
      // Reset form
      setShippingAddress('');
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return null; // Don't render if cart is empty
  }

  return (
    <div className={`bg-white p-4 rounded-lg shadow-md ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Checkout</h3>
      
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-md text-sm">
          {success}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label htmlFor="quickShippingAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Shipping Address
          </label>
          <textarea
            id="quickShippingAddress"
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Enter your shipping address"
            required
          />
        </div>

        <div className="text-sm text-gray-600">
          <p>Items in cart: {cartItems.reduce((sum, item) => sum + item.quantity, 0)}</p>
        </div>

        {!isAuthenticated && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-md text-sm">
            Please <a href="/login" className="underline">log in</a> to place an order
          </div>
        )}

        <button
          onClick={handleQuickCheckout}
          disabled={loading || !isAuthenticated || !shippingAddress.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading ? 'Placing Order...' : 'Place Order'}
        </button>
      </div>
    </div>
  );
};

export default CheckoutHelper;
