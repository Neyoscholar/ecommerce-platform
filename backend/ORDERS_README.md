# 🛒 Orders & Checkout System

## Overview
This system provides a complete order management solution with transaction safety, stock management, and comprehensive order tracking.

## 🏗️ Architecture

### Database Tables
- **`orders`**: Main order information (user, total, status, shipping address)
- **`order_items`**: Individual items within each order
- **`products`**: Product catalog with stock tracking
- **`users`**: User authentication and profiles

### Key Features
- ✅ **Transaction Safety**: Database transactions ensure data consistency
- ✅ **Stock Management**: Automatic stock validation and decrementation
- ✅ **Order Tracking**: Complete order lifecycle management
- ✅ **Admin Controls**: Order status updates and management
- ✅ **Security**: JWT authentication and role-based access control

## 🚀 API Endpoints

### Authentication Required (All endpoints)
All order endpoints require a valid JWT token in the `Authorization: Bearer <token>` header.

#### Create Order
```http
POST /api/orders
Content-Type: application/json
Authorization: Bearer <token>

{
  "items": [
    {
      "productId": 1,
      "quantity": 2
    },
    {
      "productId": 2,
      "quantity": 1
    }
  ],
  "shippingAddress": "123 Test Street, Test City, TC 12345"
}
```

#### Get User Orders
```http
GET /api/orders/my-orders
Authorization: Bearer <token>
```

#### Get Order Details
```http
GET /api/orders/:orderId
Authorization: Bearer <token>
```

#### Admin: Get All Orders
```http
GET /api/orders/admin/all
Authorization: Bearer <token>
```

#### Admin: Update Order Status
```http
PATCH /api/orders/admin/:orderId/status
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "shipped"
}
```

## 🧪 Testing the System

### Prerequisites
1. Backend running on port 4000
2. Frontend running on port 5173
3. Database connected and seeded with products

### Quick Test with curl

#### Step 1: Register a User
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Copy the token from the JSON response** - you'll need it for the next steps.

#### Step 2: Create an Order
```bash
curl -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "items": [
      {
        "productId": 1,
        "quantity": 2
      }
    ],
    "shippingAddress": "123 Test Street, Test City, TC 12345"
  }'
```

#### Step 3: Verify Stock Changed
```bash
curl http://localhost:4000/api/products?limit=3
```

Compare the stock quantities before and after creating the order.

### Automated Testing
Run the complete test suite:
```bash
cd backend
./test-orders.sh
```

## 🔒 Security Features

### Transaction Safety
- **Stock Validation**: Checks availability before processing
- **Atomic Operations**: All-or-nothing order creation
- **Rollback Protection**: Automatic rollback on errors

### Access Control
- **JWT Authentication**: Secure token-based auth
- **Role-Based Access**: Admin vs. customer permissions
- **User Isolation**: Users can only access their own orders

## 📊 Order Status Flow

```
pending → confirmed → shipped → delivered
    ↓
cancelled
```

## 🗄️ Database Schema

### Orders Table
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  shipping_address TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Order Items Table
```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);
```

## 🚨 Error Handling

### Common Error Scenarios
- **Insufficient Stock**: Order rejected if stock unavailable
- **Invalid Product**: 404 for non-existent products
- **Authentication**: 401 for missing/invalid tokens
- **Authorization**: 403 for insufficient permissions
- **Validation**: 400 for invalid input data

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

### Database Migrations
If you have an existing database, run the migration:
```bash
psql -d your_database -f database/migrations/001_add_updated_at_to_orders.sql
```

### Environment Variables
Ensure these are set in your `.env` file:
```env
JWT_SECRET=your_jwt_secret_here
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:4000/healthz
```

### Database Connection
The system automatically checks database connectivity on startup and provides detailed error information.

## 🎯 Next Steps

1. **Frontend Integration**: Connect the orders API to the React frontend
2. **Payment Processing**: Integrate with payment gateways
3. **Email Notifications**: Order confirmations and status updates
4. **Inventory Alerts**: Low stock notifications
5. **Analytics**: Order metrics and reporting

---

**🎉 Your Orders & Checkout system is now ready!** 

Test it with the provided curl commands or run the automated test script to verify everything is working correctly.
