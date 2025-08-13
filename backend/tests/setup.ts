import { jest } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  // Set up any global test configuration
  jest.setTimeout(30000);
});

// Global test teardown
afterAll(async () => {
  // Clean up any global test resources
  await new Promise(resolve => setTimeout(resolve, 500)); // Allow time for cleanup
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock the metrics setInterval to prevent Jest from hanging
jest.mock('../src/metrics', () => {
  return {
    getMetrics: jest.fn().mockResolvedValue('' as any),
    getHealthWithMetrics: jest.fn().mockResolvedValue({} as any),
    recordHttpRequest: jest.fn(),
    recordError: jest.fn(),
    default: {
      contentType: 'text/plain',
    }
  };
});

// Mock process.exit to prevent tests from exiting
const originalExit = process.exit;
beforeAll(() => {
  process.exit = jest.fn() as any;
});

afterAll(() => {
  process.exit = originalExit;
});

// Global test utilities
(global as any).testUtils = {
  // Helper to create test data
  createTestUser: () => ({
    email: `test-${Date.now()}@example.com`,
    password: 'testpassword123',
    firstName: 'Test',
    lastName: 'User',
  }),
  
  // Helper to create test product
  createTestProduct: () => ({
    name: `Test Product ${Date.now()}`,
    description: 'Test product description',
    price: 29.99,
    stockQuantity: 100,
    categoryId: 1,
    imageUrl: 'https://example.com/image.jpg',
  }),
  
  // Helper to create test order
  createTestOrder: () => ({
    items: [
      {
        productId: 1,
        quantity: 2,
      },
    ],
    shippingAddress: '123 Test Street, Test City, TC 12345',
  }),
  
  // Helper to generate random string
  randomString: (length: number = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  // Helper to generate random email
  randomEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
  
  // Helper to wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to check if object has required properties
  hasRequiredProperties: (obj: any, requiredProps: string[]) => {
    return requiredProps.every(prop => obj.hasOwnProperty(prop));
  },
  
  // Helper to validate response structure
  validateResponseStructure: (response: any, expectedStructure: any) => {
    const validate = (obj: any, structure: any): boolean => {
      if (typeof structure === 'string') {
        return typeof obj === structure;
      }
      if (Array.isArray(structure)) {
        return Array.isArray(obj) && obj.every(item => validate(item, structure[0]));
      }
      if (typeof structure === 'object' && structure !== null) {
        return Object.keys(structure).every(key => 
          obj.hasOwnProperty(key) && validate(obj[key], structure[key])
        );
      }
      return true;
    };
    return validate(response, expectedStructure);
  },
};
