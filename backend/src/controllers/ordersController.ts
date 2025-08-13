import { Request, Response } from "express";
import { z } from "zod";
import pool from "../db";
import cacheService from "../services/cache";

// Extend Request to include user info from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: "customer" | "admin";
  };
}

// ---------- Validation Schemas ----------
const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.number().positive(),
    quantity: z.number().positive().int(),
  })).min(1, "Order must contain at least one item"),
  shippingAddress: z.string().min(10, "Shipping address must be at least 10 characters"),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
});

// ---------- Cache Invalidation Helper ----------
async function invalidateProductCache() {
  try {
    // Invalidate all product-related cache keys
    await cacheService.delByPattern('products:*');
    console.log('🗑️ Product cache invalidated (order created)');
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

// ---------- Create Order ----------
export async function createOrder(req: AuthenticatedRequest, res: Response) {
  console.log('🚀 createOrder called with body:', req.body);
  console.log('👤 User from request:', req.user);
  
  const client = await pool.connect();
  console.log('🔌 Database client connected');
  
  try {
    // Start transaction
    await client.query('BEGIN');
    console.log('✅ Transaction started');
    
    // Validate request
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log('❌ Validation failed:', parsed.error.issues);
      return res.status(400).json({ 
        message: "Invalid input", 
        errors: parsed.error.issues 
      });
    }
    console.log('✅ Request validation passed');

    const { items, shippingAddress } = parsed.data;
    const userId = req.user?.id;
    console.log('📦 Order items:', items);
    console.log('🏠 Shipping address:', shippingAddress);
    console.log('👤 User ID:', userId);

    if (!userId) {
      console.log('❌ No user ID found');
      return res.status(401).json({ message: "Authentication required" });
    }

    // Validate stock availability and calculate totals
    let totalAmount = 0;
    const orderItems: Array<{
      productId: number;
      quantity: number;
      unitPrice: number;
      availableStock: number;
    }> = [];

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
        o.created_at
      FROM orders o
      WHERE o.id = $1
    `;
    
    const completeOrderResult = await client.query(completeOrderQuery, [order.id]);
    const completeOrder = completeOrderResult.rows[0];
    
    // Get order items separately
    const orderItemsQuery = `
      SELECT 
        oi.id,
        oi.product_id,
        p.name as product_name,
        oi.unit_price,
        oi.quantity,
        (oi.unit_price * oi.quantity) as subtotal
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `;
    
    const orderItemsResult = await client.query(orderItemsQuery, [order.id]);
    const orderWithItems = {
      ...completeOrder,
      items: orderItemsResult.rows
    };

    return res.status(201).json({
      message: "Order created successfully",
      order: orderWithItems
    });

  } catch (error: any) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error("createOrder failed:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    
    // Throw the error to be caught by the global error handler
    throw error;
  } finally {
    client.release();
  }
}

// ---------- Get User Orders ----------
export async function getUserOrders(req: AuthenticatedRequest, res: Response) {
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

    const { rows } = await pool.query(ordersQuery, [userId]);
    return res.json({ orders: rows });

  } catch (error: any) {
    console.error("getUserOrders failed:", error);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
}

// ---------- Get Order Details ----------
export async function getOrderDetails(req: AuthenticatedRequest, res: Response) {
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

    const { rows } = await pool.query(orderQuery, [orderId, userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json({ order: rows[0] });

  } catch (error: any) {
    console.error("getOrderDetails failed:", error);
    return res.status(500).json({ message: "Failed to fetch order details" });
  }
}

// ---------- Update Order Status (Admin only) ----------
export async function updateOrderStatus(req: AuthenticatedRequest, res: Response) {
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

    const { rows } = await pool.query(updateQuery, [status, orderId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json({ 
      message: "Order status updated successfully",
      order: rows[0]
    });

  } catch (error: any) {
    console.error("updateOrderStatus failed:", error);
    return res.status(500).json({ message: "Failed to update order status" });
  }
}

// ---------- Get All Orders (Admin only) ----------
export async function getAllOrders(req: AuthenticatedRequest, res: Response) {
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

    const { rows } = await pool.query(ordersQuery);
    return res.json({ orders: rows });

  } catch (error: any) {
    console.error("getAllOrders failed:", error);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
}
