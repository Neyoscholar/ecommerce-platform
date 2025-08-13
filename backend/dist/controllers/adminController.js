"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.getAllProductsAdmin = getAllProductsAdmin;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.deleteCategory = deleteCategory;
exports.getAllCategories = getAllCategories;
exports.getDashboardStats = getDashboardStats;
const zod_1 = require("zod");
const db_1 = __importDefault(require("../db"));
const cache_1 = __importDefault(require("../services/cache"));
// ---------- Validation Schemas ----------
const createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Product name is required").max(255, "Product name too long"),
    description: zod_1.z.string().min(1, "Description is required"),
    price: zod_1.z.number().positive("Price must be positive"),
    stock_quantity: zod_1.z.number().int().min(0, "Stock quantity must be non-negative"),
    category_id: zod_1.z.number().positive("Category ID must be positive").optional(),
    image_url: zod_1.z.string().url("Invalid image URL").optional(),
});
const updateProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Product name is required").max(255, "Product name too long").optional(),
    description: zod_1.z.string().min(1, "Description is required").optional(),
    price: zod_1.z.number().positive("Price must be positive").optional(),
    stock_quantity: zod_1.z.number().int().min(0, "Stock quantity must be non-negative").optional(),
    category_id: zod_1.z.number().positive("Category ID must be positive").optional(),
    image_url: zod_1.z.string().url("Invalid image URL").optional(),
});
const createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Category name is required").max(120, "Category name too long"),
});
const updateCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Category name is required").max(120, "Category name too long"),
});
// ---------- Admin Middleware ----------
function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
}
// ---------- Cache Invalidation Helper ----------
async function invalidateProductCache() {
    try {
        // Invalidate all product-related cache keys
        await cache_1.default.delByPattern('products:*');
        console.log('🗑️ Product cache invalidated');
    }
    catch (error) {
        console.error('Cache invalidation error:', error);
    }
}
// ---------- Product Management ----------
// Create Product
async function createProduct(req, res) {
    try {
        const parsed = createProductSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsed.error.issues
            });
        }
        const { name, description, price, stock_quantity, category_id, image_url } = parsed.data;
        // Validate category exists if provided
        if (category_id) {
            const categoryCheck = await db_1.default.query("SELECT id FROM categories WHERE id = $1", [category_id]);
            if (categoryCheck.rows.length === 0) {
                return res.status(400).json({ message: "Category not found" });
            }
        }
        const insertQuery = `
      INSERT INTO products (name, description, price, stock_quantity, category_id, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, description, price, stock_quantity, category_id, image_url, created_at
    `;
        const { rows } = await db_1.default.query(insertQuery, [
            name,
            description,
            price,
            stock_quantity,
            category_id || null,
            image_url || null
        ]);
        // Invalidate product cache after creating new product
        await invalidateProductCache();
        return res.status(201).json({
            message: "Product created successfully",
            product: rows[0]
        });
    }
    catch (error) {
        console.error("createProduct failed:", error);
        return res.status(500).json({
            message: "Failed to create product",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
// Update Product
async function updateProduct(req, res) {
    try {
        const productId = parseInt(req.params.productId);
        if (isNaN(productId)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }
        const parsed = updateProductSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsed.error.issues
            });
        }
        // Check if product exists
        const existingProduct = await db_1.default.query("SELECT id FROM products WHERE id = $1", [productId]);
        if (existingProduct.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Validate category exists if provided
        if (parsed.data.category_id) {
            const categoryCheck = await db_1.default.query("SELECT id FROM categories WHERE id = $1", [parsed.data.category_id]);
            if (categoryCheck.rows.length === 0) {
                return res.status(400).json({ message: "Category not found" });
            }
        }
        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        if (parsed.data.name !== undefined) {
            updateFields.push(`name = $${paramIndex++}`);
            values.push(parsed.data.name);
        }
        if (parsed.data.description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            values.push(parsed.data.description);
        }
        if (parsed.data.price !== undefined) {
            updateFields.push(`price = $${paramIndex++}`);
            values.push(parsed.data.price);
        }
        if (parsed.data.stock_quantity !== undefined) {
            updateFields.push(`stock_quantity = $${paramIndex++}`);
            values.push(parsed.data.stock_quantity);
        }
        if (parsed.data.category_id !== undefined) {
            updateFields.push(`category_id = $${paramIndex++}`);
            values.push(parsed.data.category_id);
        }
        if (parsed.data.image_url !== undefined) {
            updateFields.push(`image_url = $${paramIndex++}`);
            values.push(parsed.data.image_url);
        }
        if (updateFields.length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }
        values.push(productId);
        const updateQuery = `
      UPDATE products 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, description, price, stock_quantity, category_id, image_url, created_at
    `;
        const { rows } = await db_1.default.query(updateQuery, values);
        // Invalidate product cache after updating product
        await invalidateProductCache();
        return res.json({
            message: "Product updated successfully",
            product: rows[0]
        });
    }
    catch (error) {
        console.error("updateProduct failed:", error);
        return res.status(500).json({
            message: "Failed to update product",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
// Delete Product
async function deleteProduct(req, res) {
    try {
        const productId = parseInt(req.params.productId);
        if (isNaN(productId)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }
        // Check if product exists
        const existingProduct = await db_1.default.query("SELECT id, name FROM products WHERE id = $1", [productId]);
        if (existingProduct.rows.length === 0) {
            return res.status(404).json({ message: "Product not found" });
        }
        // Check if product has associated orders
        const orderCheck = await db_1.default.query("SELECT COUNT(*) FROM order_items WHERE product_id = $1", [productId]);
        const orderCount = parseInt(orderCheck.rows[0].count);
        if (orderCount > 0) {
            return res.status(400).json({
                message: `Cannot delete product '${existingProduct.rows[0].name}' - it has ${orderCount} associated order(s). Consider setting stock to 0 instead.`
            });
        }
        // Delete the product
        await db_1.default.query("DELETE FROM products WHERE id = $1", [productId]);
        // Invalidate product cache after deleting product
        await invalidateProductCache();
        return res.json({
            message: "Product deleted successfully",
            deletedProduct: existingProduct.rows[0]
        });
    }
    catch (error) {
        console.error("deleteProduct failed:", error);
        return res.status(500).json({
            message: "Failed to delete product",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
// Get All Products (Admin view with additional info)
async function getAllProductsAdmin(req, res) {
    try {
        const page = Math.max(1, Number(req.query.page ?? 1));
        const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
        const offset = (page - 1) * limit;
        const countQuery = "SELECT COUNT(*) FROM products";
        const dataQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        COALESCE(oi.total_ordered, 0) as total_ordered
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT 
          product_id, 
          SUM(quantity) as total_ordered
        FROM order_items 
        GROUP BY product_id
      ) oi ON p.id = oi.product_id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;
        const countResult = await db_1.default.query(countQuery);
        const total = Number(countResult.rows[0]?.count ?? 0);
        const dataResult = await db_1.default.query(dataQuery, [limit, offset]);
        return res.json({
            items: dataResult.rows,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    }
    catch (error) {
        console.error("getAllProductsAdmin failed:", error);
        return res.status(500).json({ message: "Failed to fetch products" });
    }
}
// ---------- Category Management ----------
// Create Category
async function createCategory(req, res) {
    try {
        const parsed = createCategorySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsed.error.issues
            });
        }
        const { name } = parsed.data;
        // Check if category already exists
        const existingCategory = await db_1.default.query("SELECT id FROM categories WHERE name = $1", [name]);
        if (existingCategory.rows.length > 0) {
            return res.status(409).json({ message: "Category already exists" });
        }
        const insertQuery = `
      INSERT INTO categories (name)
      VALUES ($1)
      RETURNING id, name, created_at
    `;
        const { rows } = await db_1.default.query(insertQuery, [name]);
        // Invalidate product cache after creating new category
        await invalidateProductCache();
        return res.status(201).json({
            message: "Category created successfully",
            category: rows[0]
        });
    }
    catch (error) {
        console.error("createCategory failed:", error);
        return res.status(500).json({
            message: "Failed to create category",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
// Update Category
async function updateCategory(req, res) {
    try {
        const categoryId = parseInt(req.params.categoryId);
        if (isNaN(categoryId)) {
            return res.status(400).json({ message: "Invalid category ID" });
        }
        const parsed = updateCategorySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsed.error.issues
            });
        }
        const { name } = parsed.data;
        // Check if category exists
        const existingCategory = await db_1.default.query("SELECT id FROM categories WHERE id = $1", [categoryId]);
        if (existingCategory.rows.length === 0) {
            return res.status(404).json({ message: "Category not found" });
        }
        // Check if new name conflicts with existing category
        const nameConflict = await db_1.default.query("SELECT id FROM categories WHERE name = $1 AND id != $2", [name, categoryId]);
        if (nameConflict.rows.length > 0) {
            return res.status(409).json({ message: "Category name already exists" });
        }
        const updateQuery = `
      UPDATE categories 
      SET name = $1
      WHERE id = $2
      RETURNING id, name, created_at
    `;
        const { rows } = await db_1.default.query(updateQuery, [name, categoryId]);
        // Invalidate product cache after updating category
        await invalidateProductCache();
        return res.json({
            message: "Category updated successfully",
            category: rows[0]
        });
    }
    catch (error) {
        console.error("updateCategory failed:", error);
        return res.status(500).json({
            message: "Failed to update category",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
// Delete Category
async function deleteCategory(req, res) {
    try {
        const categoryId = parseInt(req.params.categoryId);
        if (isNaN(categoryId)) {
            return res.status(400).json({ message: "Invalid category ID" });
        }
        // Check if category exists
        const existingCategory = await db_1.default.query("SELECT id FROM categories WHERE id = $1", [categoryId]);
        if (existingCategory.rows.length === 0) {
            return res.status(404).json({ message: "Category not found" });
        }
        // Check if category has associated products
        const productCheck = await db_1.default.query("SELECT COUNT(*) FROM products WHERE category_id = $1", [categoryId]);
        const productCount = parseInt(productCheck.rows[0].count);
        if (productCount > 0) {
            return res.status(400).json({
                message: `Cannot delete category '${existingCategory.rows[0].name}' - it has ${productCount} associated product(s). Remove or reassign products first.`
            });
        }
        // Delete the category
        await db_1.default.query("DELETE FROM categories WHERE id = $1", [categoryId]);
        // Invalidate product cache after deleting category
        await invalidateProductCache();
        return res.json({
            message: "Category deleted successfully",
            deletedCategory: existingCategory.rows[0]
        });
    }
    catch (error) {
        console.error("deleteCategory failed:", error);
        return res.status(500).json({
            message: "Failed to delete category",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
// Get All Categories
async function getAllCategories(req, res) {
    try {
        const query = `
      SELECT 
        c.*,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id, c.name, c.created_at
      ORDER BY c.name
    `;
        const { rows } = await db_1.default.query(query);
        return res.json({ categories: rows });
    }
    catch (error) {
        console.error("getAllCategories failed:", error);
        return res.status(500).json({ message: "Failed to fetch categories" });
    }
}
// ---------- Dashboard Statistics ----------
async function getDashboardStats(req, res) {
    try {
        // Get various statistics for admin dashboard
        const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM categories) as total_categories,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders) as total_revenue,
        (SELECT COUNT(*) FROM products WHERE stock_quantity = 0) as out_of_stock_products,
        (SELECT COUNT(*) FROM products WHERE stock_quantity < 10) as low_stock_products
    `;
        const { rows } = await db_1.default.query(statsQuery);
        const stats = rows[0];
        // Get recent orders
        const recentOrdersQuery = `
      SELECT 
        o.id,
        o.total_amount,
        o.status,
        o.created_at,
        u.email as customer_email,
        u.first_name,
        u.last_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `;
        const recentOrdersResult = await db_1.default.query(recentOrdersQuery);
        // Get top selling products
        const topProductsQuery = `
      SELECT 
        p.id,
        p.name,
        p.price,
        COALESCE(SUM(oi.quantity), 0) as total_sold
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id, p.name, p.price
      ORDER BY total_sold DESC
      LIMIT 5
    `;
        const topProductsResult = await db_1.default.query(topProductsQuery);
        return res.json({
            stats,
            recentOrders: recentOrdersResult.rows,
            topProducts: topProductsResult.rows
        });
    }
    catch (error) {
        console.error("getDashboardStats failed:", error);
        return res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
}
