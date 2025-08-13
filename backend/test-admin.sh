#!/bin/bash

# Test script for Admin CRUD API
# Make sure both backend and frontend are running

echo "🔐 Testing Admin CRUD API"
echo "=========================="

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
    "email": "admin@example.com",
    "password": "adminpass123",
    "firstName": "Admin",
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

# Test 2: Try to access admin endpoint (should fail - user is not admin)
echo "2️⃣ Testing admin access (should fail - user not admin)..."
ADMIN_ACCESS_TEST=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/api/admin/dashboard")
echo "Admin Access Test: $ADMIN_ACCESS_TEST"
echo ""

# Test 3: Create a category (should fail - user not admin)
echo "3️⃣ Testing category creation (should fail - user not admin)..."
CATEGORY_CREATE_TEST=$(curl -s -X POST "$API_BASE/api/admin/categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Test Category"}')
echo "Category Create Test: $CATEGORY_CREATE_TEST"
echo ""

echo "⚠️  IMPORTANT: To continue testing admin functionality, you need to:"
echo "   1. Connect to your database"
echo "   2. Run: UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';"
echo "   3. Or use the provided SQL script: make-admin.sql"
echo ""
echo "   4. Then restart this test script"
echo ""

echo "📋 Manual Admin Testing Commands:"
echo "=================================="
echo ""
echo "After making the user admin, test these commands:"
echo ""

echo "🔐 Login as admin:"
echo "curl -X POST $API_BASE/api/auth/login \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\": \"admin@example.com\", \"password\": \"adminpass123\"}'"
echo ""

echo "📊 Get admin dashboard:"
echo "curl -H \"Authorization: Bearer YOUR_ADMIN_TOKEN\" $API_BASE/api/admin/dashboard"
echo ""

echo "📦 Create a product:"
echo "curl -X POST $API_BASE/api/admin/products \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer YOUR_ADMIN_TOKEN\" \\"
echo "  -d '{"
echo "    \"name\": \"Admin Created Product\","
echo "    \"description\": \"This product was created via admin API\","
echo "    \"price\": 29.99,"
echo "    \"stock_quantity\": 100,"
echo "    \"image_url\": \"https://picsum.photos/seed/admin/400/300\""
echo "  }'"
echo ""

echo "📁 Create a category:"
echo "curl -X POST $API_BASE/api/admin/categories \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer YOUR_ADMIN_TOKEN\" \\"
echo "  -d '{\"name\": \"Admin Category\"}'"
echo ""

echo "📋 Get all products (admin view):"
echo "curl -H \"Authorization: Bearer YOUR_ADMIN_TOKEN\" $API_BASE/api/admin/products"
echo ""

echo "📋 Get all categories:"
echo "curl -H \"Authorization: Bearer YOUR_ADMIN_TOKEN\" $API_BASE/api/admin/categories"
echo ""

echo "🔄 Update a product:"
echo "curl -X PUT $API_BASE/api/admin/products/1 \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer YOUR_ADMIN_TOKEN\" \\"
echo "  -d '{\"price\": 39.99, \"stock_quantity\": 150}'"
echo ""

echo "🗑️  Delete a product (if no orders):"
echo "curl -X DELETE $API_BASE/api/admin/products/1 \\"
echo "  -H \"Authorization: Bearer YOUR_ADMIN_TOKEN\""
echo ""

echo "🎯 Next Steps:"
echo "==============="
echo "1. Make the user admin using the SQL script"
echo "2. Test the admin endpoints manually"
echo "3. Verify RBAC is working correctly"
echo "4. Test all CRUD operations"
echo ""
echo "🔗 Frontend: $FRONTEND_BASE"
echo "🔗 API Health: $API_BASE/healthz"
echo "🔗 Admin Dashboard: $API_BASE/api/admin/dashboard (with admin token)"
