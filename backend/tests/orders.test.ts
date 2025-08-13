import request from 'supertest';
import app from '../src/app';
import pool from '../src/db';
import cacheService from '../src/services/cache';
import jwt from 'jsonwebtoken';

// Mock the database, cache, and JWT services
jest.mock('../src/db');
jest.mock('../src/services/cache');
jest.mock('jsonwebtoken');

const mockPool = pool as jest.Mocked<typeof pool>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Orders API', () => {
  let server: any;
  let mockClient: any;

  beforeAll(async () => {
    server = app.listen(0);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    
    // Mock pool.connect
    mockPool.connect = jest.fn().mockResolvedValue(mockClient);
    
    // Reset cache mock
    mockCacheService.delByPattern.mockResolvedValue();
  });

  describe('POST /api/orders', () => {
    const validOrderData = {
      items: [
        {
          productId: 1,
          quantity: 2,
        },
      ],
      shippingAddress: '123 Test Street, Test City, TC 12345',
    };

    const mockProduct = {
      id: 1,
      name: 'Test Product',
      price: '29.99',
      stock_quantity: 100,
    };

    const mockUser = {
      id: 1,
      email: 'test@example.com',
      role: 'customer',
    };

    it('should create order successfully', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockUser as never);

      // Mock database queries
      mockClient.query
        .mockResolvedValueOnce({ rows: [mockProduct] }) // Get product
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Create order
        .mockResolvedValueOnce({ rows: [] }) // Create order item
        .mockResolvedValueOnce({ rows: [] }) // Update stock
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            total_amount: '59.98', 
            status: 'pending',
            items: [{ id: 1, product_id: 1, quantity: 2, unit_price: '29.99' }]
          }] 
        }); // Get complete order

      const response = await request(server)
        .post('/api/orders')
        .set('Authorization', 'Bearer valid-token')
        .send(validOrderData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('order');
      expect(response.body.message).toBe('Order created successfully');
      expect(response.body.order.status).toBe('pending');

      // Verify transaction was used
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      // Verify cache was invalidated
      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('products:*');
    });

    it('should validate required fields', async () => {
      const invalidOrderData = {
        items: [], // Empty items array
        shippingAddress: '123 Test Street',
      };

      const response = await request(server)
        .post('/api/orders')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidOrderData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid input');
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate shipping address length', async () => {
      const invalidOrderData = {
        ...validOrderData,
        shippingAddress: 'Short', // Too short
      };

      const response = await request(server)
        .post('/api/orders')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidOrderData)
        .expect(400);

      expect(response.body.message).toBe('Invalid input');
    });

    it('should check product existence', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockUser as never);

      // Mock database to return no product
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(server)
        .post('/api/orders')
        .set('Authorization', 'Bearer valid-token')
        .send(validOrderData)
        .expect(404);

      expect(response.body.message).toContain('Product with ID 1 not found');

      // Verify transaction was rolled back
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should check stock availability', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockUser as never);

      // Mock product with insufficient stock
      const lowStockProduct = { ...mockProduct, stock_quantity: 1 };

      mockClient.query.mockResolvedValueOnce({ rows: [lowStockProduct] });

      const response = await request(server)
        .post('/api/orders')
        .set('Authorization', 'Bearer valid-token')
        .send(validOrderData)
        .expect(400);

      expect(response.body.message).toContain('Insufficient stock');

      // Verify transaction was rolled back
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle database errors gracefully', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockUser as never);

      // Mock database error
      mockClient.query.mockRejectedValue(new Error('Database error'));

      const response = await request(server)
        .post('/api/orders')
        .set('Authorization', 'Bearer valid-token')
        .send(validOrderData)
        .expect(500);

      expect(response.body.message).toBe('Failed to create order');

      // Verify transaction was rolled back
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should require authentication', async () => {
      const response = await request(server)
        .post('/api/orders')
        .send(validOrderData)
        .expect(401);

      expect(response.body.message).toBe('Access token required');
    });
  });

  describe('GET /api/orders/my-orders', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      role: 'customer',
    };

    const mockOrders = [
      {
        id: 1,
        total_amount: '59.98',
        status: 'pending',
        shipping_address: '123 Test Street',
        created_at: new Date().toISOString(),
        item_count: 2,
      },
      {
        id: 2,
        total_amount: '29.99',
        status: 'delivered',
        shipping_address: '456 Test Ave',
        created_at: new Date().toISOString(),
        item_count: 1,
      },
    ];

    it('should return user orders successfully', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockUser as never);

      // Mock database query
      mockPool.query.mockResolvedValueOnce({ rows: mockOrders });

      const response = await request(server)
        .get('/api/orders/my-orders')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(response.body.orders).toHaveLength(2);
      expect(response.body.orders[0].id).toBe(1);
      expect(response.body.orders[1].id).toBe(2);
    });

    it('should require authentication', async () => {
      const response = await request(server)
        .get('/api/orders/my-orders')
        .expect(401);

      expect(response.body.message).toBe('Access token required');
    });

    it('should handle database errors gracefully', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockUser as never);

      // Mock database error
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(server)
        .get('/api/orders/my-orders')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.message).toBe('Failed to fetch orders');
    });
  });

  describe('GET /api/orders/:orderId', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      role: 'customer',
    };

    const mockOrder = {
      id: 1,
      total_amount: '59.98',
      status: 'pending',
      shipping_address: '123 Test Street',
      created_at: new Date().toISOString(),
      items: [
        {
          id: 1,
          product_id: 1,
          product_name: 'Test Product',
          product_description: 'Test description',
          product_image: 'https://example.com/image.jpg',
          unit_price: '29.99',
          quantity: 2,
          subtotal: '59.98',
        },
      ],
    };

    it('should return order details successfully', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockUser as never);

      // Mock database query
      mockPool.query.mockResolvedValueOnce({ rows: [mockOrder] });

      const response = await request(server)
        .get('/api/orders/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('order');
      expect(response.body.order.id).toBe(1);
      expect(response.body.order.items).toHaveLength(1);
      expect(response.body.order.items[0].product_name).toBe('Test Product');
    });

    it('should return 404 for non-existent order', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockUser as never);

      // Mock database to return no order
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(server)
        .get('/api/orders/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.message).toBe('Order not found');
    });

    it('should require authentication', async () => {
      const response = await request(server)
        .get('/api/orders/1')
        .expect(401);

      expect(response.body.message).toBe('Access token required');
    });

    it('should validate order ID format', async () => {
      const response = await request(server)
        .get('/api/orders/invalid-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.message).toBe('Invalid order ID');
    });
  });

  describe('PATCH /api/orders/admin/:orderId/status', () => {
    const mockAdmin = {
      id: 1,
      email: 'admin@example.com',
      role: 'admin',
    };

    const validStatusUpdate = {
      status: 'shipped',
    };

    it('should update order status successfully (admin only)', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockAdmin as never);

      // Mock database queries
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check order exists
        .mockResolvedValueOnce({ 
          rows: [{ id: 1, status: 'shipped', updated_at: new Date().toISOString() }] 
        }); // Update order

      const response = await request(server)
        .patch('/api/orders/admin/1/status')
        .set('Authorization', 'Bearer admin-token')
        .send(validStatusUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('order');
      expect(response.body.message).toBe('Order status updated successfully');
      expect(response.body.order.status).toBe('shipped');
    });

    it('should reject non-admin users', async () => {
      const mockCustomer = {
        id: 2,
        email: 'customer@example.com',
        role: 'customer',
      };

      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockCustomer as never);

      const response = await request(server)
        .patch('/api/orders/admin/1/status')
        .set('Authorization', 'Bearer customer-token')
        .send(validStatusUpdate)
        .expect(403);

      expect(response.body.message).toBe('Admin access required');
    });

    it('should validate status values', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockAdmin as never);

      const invalidStatusUpdate = {
        status: 'invalid-status',
      };

      const response = await request(server)
        .patch('/api/orders/admin/1/status')
        .set('Authorization', 'Bearer admin-token')
        .send(invalidStatusUpdate)
        .expect(400);

      expect(response.body.message).toBe('Invalid input');
    });

    it('should return 404 for non-existent order', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockAdmin as never);

      // Mock database to return no order
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(server)
        .patch('/api/orders/admin/999/status')
        .set('Authorization', 'Bearer admin-token')
        .send(validStatusUpdate)
        .expect(404);

      expect(response.body.message).toBe('Order not found');
    });
  });

  describe('GET /api/orders/admin/all', () => {
    const mockAdmin = {
      id: 1,
      email: 'admin@example.com',
      role: 'admin',
    };

    const mockOrders = [
      {
        id: 1,
        total_amount: '59.98',
        status: 'pending',
        shipping_address: '123 Test Street',
        created_at: new Date().toISOString(),
        user_email: 'customer1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        item_count: 2,
      },
      {
        id: 2,
        total_amount: '29.99',
        status: 'delivered',
        shipping_address: '456 Test Ave',
        created_at: new Date().toISOString(),
        user_email: 'customer2@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        item_count: 1,
      },
    ];

    it('should return all orders (admin only)', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockAdmin as never);

      // Mock database query
      mockPool.query.mockResolvedValueOnce({ rows: mockOrders });

      const response = await request(server)
        .get('/api/orders/admin/all')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(response.body.orders).toHaveLength(2);
      expect(response.body.orders[0].user_email).toBe('customer1@example.com');
      expect(response.body.orders[1].user_email).toBe('customer2@example.com');
    });

    it('should reject non-admin users', async () => {
      const mockCustomer = {
        id: 2,
        email: 'customer@example.com',
        role: 'customer',
      };

      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockCustomer as never);

      const response = await request(server)
        .get('/api/orders/admin/all')
        .set('Authorization', 'Bearer customer-token')
        .expect(403);

      expect(response.body.message).toBe('Admin access required');
    });
  });

  describe('Error Handling', () => {
    it('should handle JWT verification errors', async () => {
      // Mock JWT to throw error
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(server)
        .get('/api/orders/my-orders')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toBe('Invalid token');
    });

    it('should handle database connection errors', async () => {
      // Mock pool.connect to fail
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      const response = await request(server)
        .post('/api/orders')
        .set('Authorization', 'Bearer valid-token')
        .send({
          items: [{ productId: 1, quantity: 1 }],
          shippingAddress: '123 Test Street, Test City, TC 12345',
        })
        .expect(500);

      expect(response.body.message).toBe('Failed to create order');
    });
  });
});
