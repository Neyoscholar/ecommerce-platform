"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
exports.getUserOrders = getUserOrders;
exports.getOrderDetails = getOrderDetails;
exports.updateOrderStatus = updateOrderStatus;
exports.getAllOrders = getAllOrders;
const zod_1 = require("zod");
const db_1 = __importDefault(require("../db"));
const cache_1 = __importDefault(require("../services/cache"));
// ---------- Validation Schemas ----------
const createOrderSchema = zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.number().positive(),
        quantity: zod_1.z.number().positive().int(),
    })).min(1, "Order must contain at least one item"),
    shippingAddress: zod_1.z.string().min(10, "Shipping address must be at least 10 characters"),
});
const updateOrderStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
});
// ---------- Cache Invalidation Helper ----------
async function invalidateProductCache() {
    try {
        // Invalidate all product-related cache keys
        await cache_1.default.delByPattern('products:*');
        console.log('🗑️ Product cache invalidated (order created)');
    }
    catch (error) {
        console.error('Cache invalidation error:', error);
    }
}
// ---------- Create Order ----------
async function createOrder(req, res) {
    const client = await db_1.default.connect();
    try {
        // Start transaction
        await client.query('BEGIN');
        // Validate request
        const parsed = createOrderSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsed.error.issues
            });
        }
        const { items, shippingAddress } = parsed.data;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }
        // Validate stock availability and calculate totals
        let totalAmount = 0;
        const orderItems = [];
        for (const item of items) {
            // Get product details and current stock
            const productQuery = `
        SELECT id, name, price, stock_quantity 
        FROM products 
        WHERE id = $1
      `;
            const productResult = await client.query(productQuery, [item.productId]);
            if (productResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    message: `Product with ID ${item.productId} not found`
                });
            }
            const product = productResult.rows[0];
            if (product.stock_quantity < item.quantity) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`
                });
            }
            totalAmount += parseFloat(product.price) * item.quantity;
            orderItems.push({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: parseFloat(product.price),
                availableStock: product.stock_quantity,
            });
        }
        // Create order
        const orderQuery = `
      INSERT INTO orders (user_id, total_amount, status, shipping_address)
      VALUES ($1, $2, $3, $4)
      RETURNING id, total_amount, status, created_at
    `;
        const orderResult = await client.query(orderQuery, [
            userId,
            totalAmount,
            'pending',
            shippingAddress
        ]);
        const order = orderResult.rows[0];
        // Create order items and update stock
        for (const item of orderItems) {
            // Insert order item
            const orderItemQuery = `
        INSERT INTO order_items (order_id, product_id, unit_price, quantity)
        VALUES ($1, $2, $3, $4)
      `;
            await client.query(orderItemQuery, [
                order.id,
                item.productId,
                item.unitPrice,
                item.quantity
            ]);
            // Update product stock
            const updateStockQuery = `
        UPDATE products 
        SET stock_quantity = stock_quantity - $1
        WHERE id = $2
      `;
            await client.query(updateStockQuery, [item.quantity, item.productId]);
        }
        // Commit transaction
        await client.query('COMMIT');
        // Invalidate product cache after order creation (stock changed)
        await invalidateProductCache();
        // Get complete order details
        const completeOrderQuery = `
      SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.shipping_address,
        o.created_at,
        json_agg(
          json_build(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', p.name,
            'unit_price', oi.unit_price,
            'quantity', oi.quantity,
            'subtotal', (oi.unit_price * oi.quantity)
          )
        ) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.id = $1
      GROUP BY o.id, o.total_amount, o.status, o.shipping_address, o.created_at
    `;
        const completeOrderResult = await client.query(completeOrderQuery, [order.id]);
        const completeOrder = completeOrderResult.rows[0];
        return res.status(201).json({
            message: "Order created successfully",
            order: completeOrder
        });
    }
    catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error("createOrder failed:", error);
        return res.status(500).json({
            message: "Failed to create order",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
    finally {
        client.release();
    }
}
// ---------- Get User Orders ----------
async function getUserOrders(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }
        const ordersQuery = `
      SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.shipping_address,
        o.created_at,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id, o.total_amount, o.status, o.shipping_address, o.created_at
      ORDER BY o.created_at DESC
    `;
        const { rows } = await db_1.default.query(ordersQuery, [userId]);
        return res.json({ orders: rows });
    }
    catch (error) {
        console.error("getUserOrders failed:", error);
        return res.status(500).json({ message: "Failed to fetch orders" });
    }
}
// ---------- Get Order Details ----------
async function getOrderDetails(req, res) {
    try {
        const userId = req.user?.id;
        const orderId = parseInt(req.params.orderId);
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }
        if (isNaN(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        const orderQuery = `
      SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.shipping_address,
        o.created_at,
        json_agg(
          json_build(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', p.name,
            'product_description', p.description,
            'product_image', p.image_url,
            'unit_price', oi.unit_price,
            'quantity', oi.quantity,
            'subtotal', (oi.unit_price * oi.quantity)
          )
        ) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.id = $1 AND o.user_id = $2
      GROUP BY o.id, o.total_amount, o.status, o.shipping_address, o.created_at
    `;
        const { rows } = await db_1.default.query(orderQuery, [orderId, userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }
        return res.json({ order: rows[0] });
    }
    catch (error) {
        console.error("getOrderDetails failed:", error);
        return res.status(500).json({ message: "Failed to fetch order details" });
    }
}
// ---------- Update Order Status (Admin only) ----------
async function updateOrderStatus(req, res) {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const orderId = parseInt(req.params.orderId);
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }
        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Admin access required" });
        }
        if (isNaN(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        const parsed = updateOrderStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsed.error.issues
            });
        }
        const { status } = parsed.data;
        const updateQuery = `
      UPDATE orders 
      SET status = $1 
      WHERE id = $2 
      RETURNING id, status, updated_at
    `;
        const { rows } = await db_1.default.query(updateQuery, [status, orderId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }
        return res.json({
            message: "Order status updated successfully",
            order: rows[0]
        });
    }
    catch (error) {
        console.error("updateOrderStatus failed:", error);
        return res.status(500).json({ message: "Failed to update order status" });
    }
}
// ---------- Get All Orders (Admin only) ----------
async function getAllOrders(req, res) {
    try {
        const userRole = req.user?.role;
        if (userRole !== 'admin') {
            return res.status(403).json({ message: "Admin access required" });
        }
        const ordersQuery = `
      SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.shipping_address,
        o.created_at,
        u.email as user_email,
        u.first_name,
        u.last_name,
        COUNT(oi.id) as item_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id, o.total_amount, o.status, o.shipping_address, o.created_at, u.email, u.first_name, u.last_name
      ORDER BY o.created_at DESC
    `;
        const { rows } = await db_1.default.query(ordersQuery);
        return res.json({ orders: rows });
    }
    catch (error) {
        console.error("getAllOrders failed:", error);
        return res.status(500).json({ message: "Failed to fetch orders" });
    }
}
