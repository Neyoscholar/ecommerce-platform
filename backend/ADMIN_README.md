# 🔐 Admin CRUD System with RBAC

## Overview
This system provides comprehensive admin functionality with Role-Based Access Control (RBAC) for managing products, categories, and viewing business analytics.

## 🏗️ Architecture

### Security Features
- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Role-Based Access Control (RBAC)**: Admin vs. customer permissions
- ✅ **Middleware Protection**: All admin routes require admin role
- ✅ **Input Validation**: Comprehensive validation using Zod schemas

### Admin Capabilities
- 📦 **Product Management**: Create, read, update, delete products
- 📁 **Category Management**: Create, read, update, delete categories
- 📊 **Dashboard Analytics**: Business metrics and insights
- 👥 **User Management**: View customer information
- 📈 **Order Management**: View and update order statuses

## 🚀 API Endpoints

### Authentication Required
All admin endpoints require:
1. Valid JWT token in `Authorization: Bearer <token>` header
2. User must have `role = 'admin'`

### Dashboard
```http
GET /api/admin/dashboard
Authorization: Bearer <admin_token>
```

**Response**: Business statistics, recent orders, top products

### Product Management

#### Get All Products (Admin View)
```http
GET /api/admin/products?page=1&limit=50
Authorization: Bearer <admin_token>
```

#### Create Product
```http
POST /api/admin/products
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "name": "Product Name",
  "description": "Product description",
  "price": 29.99,
  "stock_quantity": 100,
  "category_id": 1,
  "image_url": "https://example.com/image.jpg"
}
```

#### Update Product
```http
PUT /api/admin/products/:productId
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "price": 39.99,
  "stock_quantity": 150
}
```

#### Delete Product
```http
DELETE /api/admin/products/:productId
Authorization: Bearer <admin_token>
```

**Note**: Products with associated orders cannot be deleted

### Category Management

#### Get All Categories
```http
GET /api/admin/categories
Authorization: Bearer <admin_token>
```

#### Create Category
```http
POST /api/admin/categories
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "name": "Category Name"
}
```

#### Update Category
```http
PUT /api/admin/categories/:categoryId
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "name": "Updated Category Name"
}
```

#### Delete Category
```http
DELETE /api/admin/categories/:categoryId
Authorization: Bearer <admin_token>
```

**Note**: Categories with associated products cannot be deleted

## 🧪 Testing the System

### Prerequisites
1. Backend running on port 4000
2. Database connected and accessible
3. User with admin role

### Step 1: Make a User Admin

#### Option A: Using SQL Script
```bash
# Connect to your database and run:
psql -d your_database -f make-admin.sql

# Or manually:
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

#### Option B: Manual SQL
```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your_email@example.com';
```

### Step 2: Test Admin Access

#### Register/Login as Admin
```bash
# Register new admin user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "adminpass123",
    "firstName": "Admin",
    "lastName": "User"
  }'

# Login as admin
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "adminpass123"
  }'
```

**Copy the token from the response** - you'll need it for admin operations.

### Step 3: Test Admin Endpoints

#### Get Dashboard Stats
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:4000/api/admin/dashboard
```

#### Create a Product
```bash
curl -X POST http://localhost:4000/api/admin/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Admin Created Product",
    "description": "This product was created via admin API",
    "price": 29.99,
    "stock_quantity": 100,
    "image_url": "https://picsum.photos/seed/admin/400/300"
  }'
```

#### Create a Category
```bash
curl -X POST http://localhost:4000/api/admin/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"name": "Admin Category"}'
```

#### Get All Products (Admin View)
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:4000/api/admin/products
```

#### Update a Product
```bash
curl -X PUT http://localhost:4000/api/admin/products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"price": 39.99, "stock_quantity": 150}'
```

### Automated Testing
Run the complete admin test suite:
```bash
cd backend
./test-admin.sh
```

## 🔒 Security Features

### Role-Based Access Control
- **Customer Role**: Can only view products and place orders
- **Admin Role**: Full access to all admin endpoints
- **Middleware Protection**: Automatic role verification

### Input Validation
- **Zod Schemas**: Comprehensive validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **Data Sanitization**: Input cleaning and validation

### Business Logic Protection
- **Delete Constraints**: Products/categories with dependencies cannot be deleted
- **Stock Validation**: Stock quantities must be non-negative
- **Category Validation**: Categories must exist before product assignment

## 📊 Dashboard Analytics

### Business Metrics
- Total products, customers, orders, categories
- Total revenue
- Out-of-stock and low-stock products

### Recent Activity
- Latest orders with customer details
- Top-selling products by quantity

### Inventory Insights
- Stock levels and alerts
- Product performance metrics

## 🗄️ Database Schema

### Admin-Specific Views
The admin system provides enhanced views of existing data:
- **Products**: Includes category names and total order quantities
- **Categories**: Includes product counts
- **Orders**: Includes customer details and order statistics

### Data Integrity
- **Foreign Key Constraints**: Maintains referential integrity
- **Cascade Rules**: Proper deletion behavior
- **Transaction Safety**: Atomic operations for complex updates

## 🚨 Error Handling

### Common Error Scenarios
- **403 Forbidden**: User lacks admin privileges
- **401 Unauthorized**: Invalid or missing authentication token
- **400 Bad Request**: Invalid input data
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Resource already exists or has dependencies

### Error Response Format
```json
{
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation message"
    }
  ]
}
```

## 🔧 Development

### Running the Backend
```bash
cd backend
npm run dev
```

### Database Setup
Ensure your database has the required tables and the user has admin role:
```sql
-- Check user roles
SELECT email, role FROM users;

-- Make user admin
UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
```

### Environment Variables
Ensure these are set in your `.env` file:
```env
JWT_SECRET=your_jwt_secret_here
DATABASE_URL=postgresql://user:password@localhost:5432/database
NODE_ENV=development
```

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:4000/healthz
```

### Admin Dashboard
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:4000/api/admin/dashboard
```

## 🎯 Next Steps

1. **Frontend Admin Panel**: Create React components for admin interface
2. **Advanced Analytics**: More detailed business intelligence
3. **Bulk Operations**: Import/export products and categories
4. **Audit Logging**: Track admin actions and changes
5. **Advanced Permissions**: Granular role-based access control

## 🧪 Testing Checklist

- [ ] User registration and login
- [ ] Admin role assignment
- [ ] Dashboard access
- [ ] Product CRUD operations
- [ ] Category CRUD operations
- [ ] RBAC enforcement
- [ ] Input validation
- [ ] Error handling
- [ ] Data integrity

---

**🎉 Your Admin CRUD system with RBAC is now ready!** 

Test it with the provided curl commands or run the automated test script to verify everything is working correctly. The system provides secure, role-based access to comprehensive product and category management capabilities.
