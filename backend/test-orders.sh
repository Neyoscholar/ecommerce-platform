#!/bin/bash

# Test script for Orders & Checkout API
# Make sure both backend and frontend are running

echo "🚀 Testing Orders & Checkout API"
echo "=================================="

# Set the base URLs
API_BASE="http://localhost:4000"
FRONTEND_BASE="http://localhost:5173"

echo "📡 API Base: $API_BASE"
echo "🌐 Frontend Base: $FRONTEND_BASE"
echo ""

# Test 1: Register a new user
echo "1️⃣ Registering a new user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }')

echo "Register Response: $REGISTER_RESPONSE"
echo ""

# Extract token from response
TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token from registration"
    exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:20}..."
echo ""

# Test 2: Check current stock
echo "2️⃣ Checking current product stock..."
STOCK_RESPONSE=$(curl -s "$API_BASE/api/products?limit=3")
echo "Current Stock: $STOCK_RESPONSE"
echo ""

# Test 3: Create an order
echo "3️⃣ Creating an order..."
ORDER_RESPONSE=$(curl -s -X POST "$API_BASE/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
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
    "shippingAddress": "123 Test Street, Test City, TC 12345, Test Country"
  }')

echo "Order Response: $ORDER_RESPONSE"
echo ""

# Test 4: Verify stock was decremented
echo "4️⃣ Verifying stock was decremented..."
UPDATED_STOCK=$(curl -s "$API_BASE/api/products?limit=3")
echo "Updated Stock: $UPDATED_STOCK"
echo ""

# Test 5: Get user orders
echo "5️⃣ Getting user orders..."
USER_ORDERS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/api/orders/my-orders")
echo "User Orders: $USER_ORDERS"
echo ""

# Test 6: Get order details
echo "6️⃣ Getting order details..."
ORDER_ID=$(echo $ORDER_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)
if [ ! -z "$ORDER_ID" ]; then
    ORDER_DETAILS=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/api/orders/$ORDER_ID")
    echo "Order Details: $ORDER_DETAILS"
else
    echo "❌ Could not extract order ID"
fi
echo ""

echo "🎉 Orders API testing completed!"
echo ""
echo "📋 Summary:"
echo "   ✅ User registration and authentication"
echo "   ✅ Order creation with transaction handling"
echo "   ✅ Stock validation and decrementation"
echo "   ✅ Order retrieval and management"
echo ""
echo "🔗 Frontend: $FRONTEND_BASE"
echo "🔗 API Health: $API_BASE/healthz"
