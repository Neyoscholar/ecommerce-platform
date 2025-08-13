import request from 'supertest';
import app from '../src/app';
import pool from '../src/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock the database and bcrypt
jest.mock('../src/db');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockPool = pool as jest.Mocked<typeof pool>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

// Type the mock query method properly
const mockQuery = mockPool.query as jest.MockedFunction<any>;

describe('Authentication API', () => {
  let server: any;

  beforeAll(async () => {
    server = app.listen(0);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register a new user successfully', async () => {
      // Mock bcrypt hash
      mockBcrypt.hash.mockResolvedValue('hashedpassword' as never);
      
      // Mock database queries
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Check if user exists
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            email: validUserData.email,
            first_name: validUserData.firstName,
            last_name: validUserData.lastName,
            role: 'customer',
            created_at: new Date().toISOString()
          }] 
        }); // Insert user

      const response = await request(server)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user.email).toBe(validUserData.email);
      expect(response.body.user.first_name).toBe(validUserData.firstName);
      expect(response.body.user.last_name).toBe(validUserData.lastName);
      expect(response.body.user.role).toBe('customer');

      // Verify password was hashed
      expect(mockBcrypt.hash).toHaveBeenCalledWith(validUserData.password, 10);

      // Verify database was called
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should return error for existing email', async () => {
      // Mock database to return existing user
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ id: 1, email: validUserData.email }] 
      });

      const response = await request(server)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(409);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('User already exists');

      // Verify database was called only once (check query)
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should validate required fields', async () => {
      const invalidUserData = {
        email: 'test@example.com',
        // Missing password, firstName, lastName
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(invalidUserData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid input');
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate email format', async () => {
      const invalidUserData = {
        ...validUserData,
        email: 'invalid-email',
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(invalidUserData)
        .expect(400);

      expect(response.body.message).toBe('Invalid input');
    });

    it('should validate password length', async () => {
      const invalidUserData = {
        ...validUserData,
        password: '123', // Too short
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(invalidUserData)
        .expect(400);

      expect(response.body.message).toBe('Invalid input');
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(server)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Failed to register user');
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'testpassword123',
    };

    it('should login user successfully', async () => {
      const mockUser = {
        id: 1,
        email: validLoginData.email,
        password: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
      };

      // Mock database query
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
      
      // Mock bcrypt compare
      mockBcrypt.compare.mockResolvedValue(true as never);
      
      // Mock JWT sign
      mockJwt.sign.mockReturnValue('mock-jwt-token' as never);

      const response = await request(server)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBe('mock-jwt-token');

      // Verify password was compared
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        validLoginData.password,
        mockUser.password
      );

      // Verify JWT was signed
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId: mockUser.id, email: mockUser.email, role: mockUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
    });

    it('should return error for non-existent user', async () => {
      // Mock database to return no user
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(server)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return error for incorrect password', async () => {
      const mockUser = {
        id: 1,
        email: validLoginData.email,
        password: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
      };

      // Mock database query
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
      
      // Mock bcrypt compare to return false
      mockBcrypt.compare.mockResolvedValue(false as never);

      const response = await request(server)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid credentials');

      // Verify password was compared
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        validLoginData.password,
        mockUser.password
      );
    });

    it('should validate required fields', async () => {
      const invalidLoginData = {
        email: 'test@example.com',
        // Missing password
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(invalidLoginData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid input');
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(server)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Failed to login');
    });
  });

  describe('GET /api/auth/profile', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'customer',
      created_at: new Date().toISOString(),
    };

    it('should return user profile with valid token', async () => {
      // Mock JWT verify
      mockJwt.verify.mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      } as never);

      // Mock database query
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(server)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual(mockUser);

      // Verify JWT was verified
      expect(mockJwt.verify).toHaveBeenCalledWith(
        'valid-token',
        process.env.JWT_SECRET
      );
    });

    it('should return error for missing token', async () => {
      const response = await request(server)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Access token required');
    });

    it('should return error for invalid token', async () => {
      // Mock JWT verify to throw error
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(server)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid token');
    });

    it('should return error for expired token', async () => {
      // Mock JWT verify to throw TokenExpiredError
      const TokenExpiredError = new Error('jwt expired');
      (TokenExpiredError as any).name = 'TokenExpiredError';
      mockJwt.verify.mockImplementation(() => {
        throw TokenExpiredError;
      });

      const response = await request(server)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Token expired');
    });

    it('should return error for user not found', async () => {
      // Mock JWT verify
      mockJwt.verify.mockReturnValue({
        userId: 999, // Non-existent user ID
        email: 'nonexistent@example.com',
        role: 'customer',
      } as never);

      // Mock database to return no user
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(server)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('PUT /api/auth/profile', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'customer',
    };

    const validUpdateData = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user profile successfully', async () => {
      // Mock JWT verify
      mockJwt.verify.mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      } as never);

      // Mock database queries
      mockQuery
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValueOnce({ 
          rows: [{ ...mockUser, ...validUpdateData }] 
        }); // Update user

      const response = await request(server)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .send(validUpdateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.first_name).toBe(validUpdateData.firstName);
      expect(response.body.user.last_name).toBe(validUpdateData.lastName);

      // Verify database was called
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should validate update data', async () => {
      // Mock JWT verify
      mockJwt.verify.mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      } as never);

      const invalidUpdateData = {
        firstName: '', // Empty string
        lastName: 'a'.repeat(200), // Too long
      };

      const response = await request(server)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid input');
    });

    it('should return error for user not found', async () => {
      // Mock JWT verify
      mockJwt.verify.mockReturnValue({
        userId: 999,
        email: 'nonexistent@example.com',
        role: 'customer',
      } as never);

      // Mock database to return no user
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(server)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .send(validUpdateData)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle bcrypt errors gracefully', async () => {
      // Mock bcrypt to throw error
      mockBcrypt.hash.mockRejectedValue(new Error('Bcrypt error'));

      const response = await request(server)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'testpassword123',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(500);

      expect(response.body.message).toBe('Failed to register user');
    });

    it('should handle JWT errors gracefully', async () => {
      // Mock JWT sign to throw error
      mockJwt.sign.mockImplementation(() => {
        throw new Error('JWT error');
      });

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
      mockBcrypt.compare.mockResolvedValue(true as never);

      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123',
        })
        .expect(500);

      expect(response.body.message).toBe('Failed to login');
    });
  });
});
