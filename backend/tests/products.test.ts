import request from 'supertest';
import app from '../src/app';
import pool from '../src/db';
import cacheService from '../src/services/cache';

// Mock the database and cache services
jest.mock('../src/db');
jest.mock('../src/services/cache');

const mockPool = pool as jest.Mocked<typeof pool>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('Products API', () => {
  let server: any;

  beforeAll(async () => {
    // Create a test server instance
    server = app.listen(0); // Use random port for testing
  });

  afterAll(async () => {
    // Close the server
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset cache mock
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue();
  });

  describe('GET /api/products', () => {
    it('should return products with pagination', async () => {
      // Mock database response
      const mockProducts = [
        {
          id: 1,
          name: 'Test Product 1',
          description: 'Test description 1',
          price: '29.99',
          stock_quantity: 100,
          category_id: 1,
          image_url: 'https://example.com/image1.jpg',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'Test Product 2',
          description: 'Test description 2',
          price: '39.99',
          stock_quantity: 50,
          category_id: 2,
          image_url: 'https://example.com/image2.jpg',
          created_at: new Date().toISOString(),
        },
      ];

      const mockCountResult = { rows: [{ count: '2' }] };
      const mockProductsResult = { rows: mockProducts };

      // Mock database queries
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce(mockCountResult) // Count query
        .mockResolvedValueOnce(mockProductsResult); // Products query

      const response = await request(server)
        .get('/api/products')
        .query({ page: 1, limit: 10 })
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('total');

      // Verify response values
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
      expect(response.body.total).toBe(2);
      expect(response.body.items).toHaveLength(2);

      // Verify product structure
      const product = response.body.items[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('description');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('stock_quantity');
      expect(product).toHaveProperty('category_id');
      expect(product).toHaveProperty('image_url');
      expect(product).toHaveProperty('created_at');

      // Verify database was called
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should return products from cache when available', async () => {
      // Mock cached response
      const cachedResponse = {
        items: [
          {
            id: 1,
            name: 'Cached Product',
            description: 'Cached description',
            price: '19.99',
            stock_quantity: 75,
            category_id: 1,
            image_url: 'https://example.com/cached.jpg',
            created_at: new Date().toISOString(),
          },
        ],
        page: 1,
        limit: 10,
        total: 1,
      };

      mockCacheService.get.mockResolvedValue(cachedResponse);

      const response = await request(server)
        .get('/api/products')
        .query({ page: 1, limit: 10 })
        .expect(200);

      // Verify cached response
      expect(response.body).toEqual(cachedResponse);

      // Verify cache was checked
      expect(mockCacheService.get).toHaveBeenCalledWith(
        'products:1:10:all:none'
      );

      // Verify database was not called
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      (mockPool.query as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(server)
        .get('/api/products')
        .query({ page: 1, limit: 10 })
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Failed to fetch products');
    });

    it('should handle invalid query parameters gracefully', async () => {
      // Mock database response for invalid parameters
      const mockProducts = [
        {
          id: 1,
          name: 'Default Product',
          description: 'Default description',
          price: '19.99',
          stock_quantity: 50,
          category_id: 1,
          image_url: 'https://example.com/default.jpg',
          created_at: new Date().toISOString(),
        },
      ];

      const mockCountResult = { rows: [{ count: '1' }] };
      const mockProductsResult = { rows: mockProducts };

      // Mock database queries
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce(mockCountResult) // Count query
        .mockResolvedValueOnce(mockProductsResult); // Products query

      const response = await request(server)
        .get('/api/products')
        .query({ page: 'invalid', limit: 'invalid' })
        .expect(200);

      // Should default to valid values
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(12); // Default limit
      expect(response.body.items).toHaveLength(1);
    });
  });
});
