import axios from 'axios';

const API_URL = 'http://localhost:4000';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  stock_quantity: number;
  category_id: number;
  image_url?: string;
  created_at: string;
}

export interface CartItem {
  productId: number;
  quantity: number;
}

export interface OrderData {
  items: CartItem[];
  shippingAddress: string;
}

export interface Order {
  id: number;
  total_amount: string;
  status: string;
  shipping_address: string;
  created_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_description: string;
  product_image: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
}

// Auth API
export const authAPI = {
  // Login user
  login: async (data: LoginData): Promise<{ token: string; user: User }> => {
    const response = await api.post('/api/auth/login', data);
    const { token, user } = response.data;
    
    // Save to localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return { token, user };
  },

  // Register user
  register: async (data: RegisterData): Promise<{ message: string; user: User }> => {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },

  // Get user profile
  getProfile: async (): Promise<User> => {
    const response = await api.get('/api/auth/profile');
    return response.data.user;
  },

  // Update user profile
  updateProfile: async (data: { firstName?: string; lastName?: string }): Promise<{ message: string; user: User }> => {
    const response = await api.put('/api/auth/profile', data);
    return response.data;
  },

  // Logout user
  logout: (): void => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/';
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('authToken');
  },

  // Get current user from localStorage
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// Products API
export const productsAPI = {
  // Get products with pagination and filters
  getProducts: async (params: {
    page?: number;
    limit?: number;
    category?: number;
    search?: string;
  } = {}) => {
    const response = await api.get('/api/products', { params });
    return response.data;
  },
};

// Orders API
export const ordersAPI = {
  // Place a new order
  placeOrder: async (data: OrderData): Promise<Order> => {
    const response = await api.post('/api/orders', data);
    return response.data.order;
  },

  // Get user orders
  getUserOrders: async (): Promise<Order[]> => {
    const response = await api.get('/api/orders');
    return response.data.orders;
  },

  // Get order by ID
  getOrder: async (orderId: number): Promise<Order> => {
    const response = await api.get(`/api/orders/${orderId}`);
    return response.data.order;
  },

  // Update order status (admin only)
  updateOrderStatus: async (orderId: number, status: string): Promise<Order> => {
    const response = await api.put(`/api/orders/${orderId}/status`, { status });
    return response.data.order;
  },
};

// Cart management (local storage based)
export const cartAPI = {
  // Get cart items
  getCart: (): CartItem[] => {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
  },

  // Add item to cart
  addToCart: (productId: number, quantity: number = 1): void => {
    const cart = cartAPI.getCart();
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ productId, quantity });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
  },

  // Update cart item quantity
  updateCartItem: (productId: number, quantity: number): void => {
    const cart = cartAPI.getCart();
    const item = cart.find(item => item.productId === productId);
    
    if (item) {
      if (quantity <= 0) {
        cartAPI.removeFromCart(productId);
      } else {
        item.quantity = quantity;
        localStorage.setItem('cart', JSON.stringify(cart));
      }
    }
  },

  // Remove item from cart
  removeFromCart: (productId: number): void => {
    const cart = cartAPI.getCart();
    const filteredCart = cart.filter(item => item.productId !== productId);
    localStorage.setItem('cart', JSON.stringify(filteredCart));
  },

  // Clear cart
  clearCart: (): void => {
    localStorage.removeItem('cart');
  },

  // Get cart total items
  getCartItemCount: (): number => {
    const cart = cartAPI.getCart();
    return cart.reduce((total, item) => total + item.quantity, 0);
  },
};

export default api;
