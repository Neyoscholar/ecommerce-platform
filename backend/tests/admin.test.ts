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

describe('Admin API', () => {
  let server: any;

  beforeAll(async () => {
    server = app.listen(0);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset cache mock
    mockCacheService.delByPattern.mockResolvedValue();
  });

  const mockAdmin = {
    id: 1,
    email: 'admin@example.com',
    role: 'admin',
  };

  const mockCustomer = {
    id: 2,
    email: 'customer@example.com',
    role: 'customer',
  };

  describe('Product Management', () => {
    const validProductData = {
      name: 'Test Product',
      description: 'Test product description',
      price: 29.99,
      stockQuantity: 100,
      categoryId: 1,
      imageUrl: 'https://example.com/image.jpg',
    };

    describe('POST /api/admin/products', () => {
      it('should create product successfully (admin only)', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        // Mock database queries
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check category exists
          .mockResolvedValueOnce({ 
            rows: [{ id: 1, ...validProductData, created_at: new Date().toISOString() }] 
          }); // Create product

        const response = await request(server)
          .post('/api/admin/products')
          .set('Authorization', 'Bearer admin-token')
          .send(validProductData)
          .expect(201);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('product');
        expect(response.body.message).toBe('Product created successfully');
        expect(response.body.product.name).toBe(validProductData.name);

        // Verify cache was invalidated
        expect(mockCacheService.delByPattern).toHaveBeenCalledWith('products:*');
      });

      it('should reject non-admin users', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockCustomer as never);

        const response = await request(server)
          .post('/api/admin/products')
          .set('Authorization', 'Bearer customer-token')
          .send(validProductData)
          .expect(403);

        expect(response.body.message).toBe('Admin access required');
      });

      it('should validate required fields', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        const invalidProductData = {
          name: '', // Empty name
          description: 'Test description',
          price: 29.99,
        };

        const response = await request(server)
          .post('/api/admin/products')
          .set('Authorization', 'Bearer admin-token')
          .send(invalidProductData)
          .expect(400);

        expect(response.body.message).toBe('Invalid input');
        expect(response.body).toHaveProperty('errors');
      });

      it('should validate price is positive', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        const invalidProductData = {
          ...validProductData,
          price: -10, // Negative price
        };

        const response = await request(server)
          .post('/api/admin/products')
          .set('Authorization', 'Bearer admin-token')
          .send(invalidProductData)
          .expect(400);

        expect(response.body.message).toBe('Invalid input');
      });

      it('should check category existence', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        // Mock database to return no category
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(server)
          .post('/api/admin/products')
          .set('Authorization', 'Bearer admin-token')
          .send(validProductData)
          .expect(400);

        expect(response.body.message).toBe('Category not found');
      });
    });

    describe('PUT /api/admin/products/:productId', () => {
      it('should update product successfully (admin only)', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        const updateData = {
          name: 'Updated Product Name',
          price: 39.99,
        };

        // Mock database queries
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check product exists
          .mockResolvedValueOnce({ 
            rows: [{ id: 1, ...validProductData, ...updateData, created_at: new Date().toISOString() }] 
          }); // Update product

        const response = await request(server)
          .put('/api/admin/products/1')
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('product');
        expect(response.body.message).toBe('Product updated successfully');
        expect(response.body.product.name).toBe(updateData.name);
        expect(response.body.product.price).toBe(updateData.price);

        // Verify cache was invalidated
        expect(mockCacheService.delByPattern).toHaveBeenCalledWith('products:*');
      });

      it('should return 404 for non-existent product', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        // Mock database to return no product
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(server)
          .put('/api/admin/products/999')
          .set('Authorization', 'Bearer admin-token')
          .send({ name: 'Updated Name' })
          .expect(404);

        expect(response.body.message).toBe('Product not found');
      });

      it('should validate product ID format', async () => {
        const response = await request(server)
          .put('/api/admin/products/invalid-id')
          .set('Authorization', 'Bearer admin-token')
          .send({ name: 'Updated Name' })
          .expect(400);

        expect(response.body.message).toBe('Invalid product ID');
      });
    });

    describe('DELETE /api/admin/products/:productId', () => {
      it('should delete product successfully (admin only)', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        const mockProduct = {
          id: 1,
          name: 'Product to Delete',
        };

        // Mock database queries
        mockPool.query
          .mockResolvedValueOnce({ rows: [mockProduct] }) // Check product exists
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Check no orders
          .mockResolvedValueOnce({ rows: [] }); // Delete product

        const response = await request(server)
          .delete('/api/admin/products/1')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('deletedProduct');
        expect(response.body.message).toBe('Product deleted successfully');
        expect(response.body.deletedProduct.name).toBe('Product to Delete');

        // Verify cache was invalidated
        expect(mockCacheService.delByPattern).toHaveBeenCalledWith('products:*');
      });

      it('should prevent deletion of products with orders', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        const mockProduct = {
          id: 1,
          name: 'Product with Orders',
        };

        // Mock database queries
        mockPool.query
          .mockResolvedValueOnce({ rows: [mockProduct] }) // Check product exists
          .mockResolvedValueOnce({ rows: [{ count: '5' }] }); // Check has orders

        const response = await request(server)
          .delete('/api/admin/products/1')
          .set('Authorization', 'Bearer admin-token')
          .expect(400);

        expect(response.body.message).toContain('Cannot delete product');
        expect(response.body.message).toContain('it has 5 associated order(s)');
      });
    });

    describe('GET /api/admin/products', () => {
      it('should return all products with admin info (admin only)', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        const mockProducts = [
          {
            id: 1,
            name: 'Product 1',
            description: 'Description 1',
            price: '29.99',
            stock_quantity: 100,
            category_id: 1,
            category_name: 'Electronics',
            total_ordered: 25,
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            name: 'Product 2',
            description: 'Description 2',
            price: '39.99',
            stock_quantity: 50,
            category_id: 2,
            category_name: 'Clothing',
            total_ordered: 10,
            created_at: new Date().toISOString(),
          },
        ];

        // Mock database query
        mockPool.query.mockResolvedValueOnce({ 
          rows: mockProducts,
          rowCount: 2
        });

        const response = await request(server)
          .get('/api/admin/products')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body).toHaveProperty('items');
        expect(response.body.items).toHaveLength(2);
        expect(response.body.items[0].category_name).toBe('Electronics');
        expect(response.body.items[1].category_name).toBe('Clothing');
      });
    });
  });

  describe('Category Management', () => {
    const validCategoryData = {
      name: 'Test Category',
    };

    describe('POST /api/admin/categories', () => {
      it('should create category successfully (admin only)', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        // Mock database queries
        mockPool.query
          .mockResolvedValueOnce({ rows: [] }) // Check if category exists
          .mockResolvedValueOnce({ 
            rows: [{ id: 1, ...validCategoryData, created_at: new Date().toISOString() }] 
          }); // Create category

        const response = await request(server)
          .post('/api/admin/categories')
          .set('Authorization', 'Bearer admin-token')
          .send(validCategoryData)
          .expect(201);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('category');
        expect(response.body.message).toBe('Category created successfully');
        expect(response.body.category.name).toBe(validCategoryData.name);

        // Verify cache was invalidated
        expect(mockCacheService.delByPattern).toHaveBeenCalledWith('products:*');
      });

      it('should return error for existing category name', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        // Mock database to return existing category
        mockPool.query.mockResolvedValueOnce({ 
          rows: [{ id: 1, name: validCategoryData.name }] 
        });

        const response = await request(server)
          .post('/api/admin/categories')
          .set('Authorization', 'Bearer admin-token')
          .send(validCategoryData)
          .expect(409);

        expect(response.body.message).toBe('Category already exists');
      });
    });

    describe('PUT /api/admin/categories/:categoryId', () => {
      it('should update category successfully (admin only)', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        const updateData = {
          name: 'Updated Category Name',
        };

        // Mock database queries
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check category exists
          .mockResolvedValueOnce({ rows: [] }) // Check name conflict
          .mockResolvedValueOnce({ 
            rows: [{ id: 1, ...validCategoryData, ...updateData, created_at: new Date().toISOString() }] 
          }); // Update category

        const response = await request(server)
          .put('/api/admin/categories/1')
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('category');
        expect(response.body.message).toBe('Category updated successfully');
        expect(response.body.category.name).toBe(updateData.name);

        // Verify cache was invalidated
        expect(mockCacheService.delByPattern).toHaveBeenCalledWith('products:*');
      });

      it('should prevent duplicate category names', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        // Mock database queries
        mockPool.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check category exists
          .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Existing Category' }] }); // Check name conflict

        const response = await request(server)
          .put('/api/admin/categories/1')
          .set('Authorization', 'Bearer admin-token')
          .send({ name: 'Existing Category' })
          .expect(409);

        expect(response.body.message).toBe('Category name already exists');
      });
    });

    describe('DELETE /api/admin/categories/:categoryId', () => {
      it('should delete category successfully (admin only)', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        const mockCategory = {
          id: 1,
          name: 'Category to Delete',
        };

        // Mock database queries
        mockPool.query
          .mockResolvedValueOnce({ rows: [mockCategory] }) // Check category exists
          .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Check no products
          .mockResolvedValueOnce({ rows: [] }); // Delete category

        const response = await request(server)
          .delete('/api/admin/categories/1')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('deletedCategory');
        expect(response.body.message).toBe('Category deleted successfully');
        expect(response.body.deletedCategory.name).toBe('Category to Delete');

        // Verify cache was invalidated
        expect(mockCacheService.delByPattern).toHaveBeenCalledWith('products:*');
      });

      it('should prevent deletion of categories with products', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        const mockCategory = {
          id: 1,
          name: 'Category with Products',
        };

        // Mock database queries
        mockPool.query
          .mockResolvedValueOnce({ rows: [mockCategory] }) // Check category exists
          .mockResolvedValueOnce({ rows: [{ count: '3' }] }); // Check has products

        const response = await request(server)
          .delete('/api/admin/categories/1')
          .set('Authorization', 'Bearer admin-token')
          .expect(400);

        expect(response.body.message).toContain('Cannot delete category');
        expect(response.body.message).toContain('it has 3 associated product(s)');
      });
    });

    describe('GET /api/admin/categories', () => {
      it('should return all categories with product counts (admin only)', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        const mockCategories = [
          {
            id: 1,
            name: 'Electronics',
            created_at: new Date().toISOString(),
            product_count: '15',
          },
          {
            id: 2,
            name: 'Clothing',
            created_at: new Date().toISOString(),
            product_count: '8',
          },
        ];

        // Mock database query
        mockPool.query.mockResolvedValueOnce({ rows: mockCategories });

        const response = await request(server)
          .get('/api/admin/categories')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body).toHaveProperty('categories');
        expect(response.body.categories).toHaveLength(2);
        expect(response.body.categories[0].name).toBe('Electronics');
        expect(response.body.categories[0].product_count).toBe('15');
        expect(response.body.categories[1].name).toBe('Clothing');
        expect(response.body.categories[1].product_count).toBe('8');
      });
    });
  });

  describe('Dashboard', () => {
    describe('GET /api/admin/dashboard', () => {
      it('should return dashboard statistics (admin only)', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockAdmin as never);

        const mockStats = {
          total_products: '150',
          total_customers: '500',
          total_orders: '75',
          total_categories: '8',
          total_revenue: '12500.50',
          out_of_stock_products: '3',
          low_stock_products: '12',
        };

        const mockRecentOrders = [
          {
            id: 1,
            total_amount: '99.99',
            status: 'pending',
            created_at: new Date().toISOString(),
            customer_email: 'customer1@example.com',
            first_name: 'John',
            last_name: 'Doe',
          },
        ];

        const mockTopProducts = [
          {
            id: 1,
            name: 'Best Seller',
            price: '29.99',
            total_sold: '45',
          },
        ];

        // Mock database queries
        mockPool.query
          .mockResolvedValueOnce({ rows: [mockStats] }) // Stats query
          .mockResolvedValueOnce({ rows: mockRecentOrders }) // Recent orders
          .mockResolvedValueOnce({ rows: mockTopProducts }); // Top products

        const response = await request(server)
          .get('/api/admin/dashboard')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body).toHaveProperty('stats');
        expect(response.body).toHaveProperty('recentOrders');
        expect(response.body).toHaveProperty('topProducts');

        expect(response.body.stats.total_products).toBe('150');
        expect(response.body.stats.total_revenue).toBe('12500.50');
        expect(response.body.recentOrders).toHaveLength(1);
        expect(response.body.topProducts).toHaveLength(1);
      });

      it('should reject non-admin users', async () => {
        // Mock JWT verification
        mockJwt.verify.mockReturnValue(mockCustomer as never);

        const response = await request(server)
          .get('/api/admin/dashboard')
          .set('Authorization', 'Bearer customer-token')
          .expect(403);

        expect(response.body.message).toBe('Admin access required');
      });
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for all admin endpoints', async () => {
      const adminEndpoints = [
        { method: 'POST', path: '/api/admin/products' },
        { method: 'PUT', path: '/api/admin/products/1' },
        { method: 'DELETE', path: '/api/admin/products/1' },
        { method: 'GET', path: '/api/admin/products' },
        { method: 'POST', path: '/api/admin/categories' },
        { method: 'PUT', path: '/api/admin/categories/1' },
        { method: 'DELETE', path: '/api/admin/categories/1' },
        { method: 'GET', path: '/api/admin/categories' },
        { method: 'GET', path: '/api/admin/dashboard' },
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(server)
          [endpoint.method.toLowerCase()](endpoint.path)
          .expect(401);

        expect(response.body.message).toBe('Access token required');
      }
    });

    it('should require admin role for all admin endpoints', async () => {
      // Mock JWT verification for customer
      mockJwt.verify.mockReturnValue(mockCustomer as never);

      const adminEndpoints = [
        { method: 'POST', path: '/api/admin/products' },
        { method: 'GET', path: '/api/admin/dashboard' },
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(server)
          [endpoint.method.toLowerCase()](endpoint.path)
          .set('Authorization', 'Bearer customer-token')
          .expect(403);

        expect(response.body.message).toBe('Admin access required');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock JWT verification
      mockJwt.verify.mockReturnValue(mockAdmin as never);

      // Mock database error
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(server)
        .get('/api/admin/products')
        .set('Authorization', 'Bearer admin-token')
        .expect(500);

      expect(response.body.message).toBe('Failed to fetch products');
    });

    it('should handle JWT verification errors', async () => {
      // Mock JWT to throw error
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(server)
        .get('/api/admin/dashboard')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toBe('Invalid token');
    });
  });
});
