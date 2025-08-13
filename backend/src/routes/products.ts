// backend/src/routes/products.ts
import { Router, Request, Response } from "express";
import pool from "../db"; // <-- default export from db.ts
import cacheService from "../services/cache";

const router = Router();

/**
 * GET /api/products
 * Query params:
 *   - page   (number, default 1)
 *   - limit  (number, default 12, max 50)
 *   - category (number)
 *   - search  (string)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 12) || 12));
    const offset = (page - 1) * limit;

    const category =
      req.query.category !== undefined ? Number(req.query.category) : undefined;
    const search =
      req.query.search !== undefined ? String(req.query.search) : undefined;

    // Build cache key based on query parameters
    const cacheKey = `products:${page}:${limit}:${category || 'all'}:${search || 'none'}`;
    
    // Try to get from cache first
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      console.log('🚀 Serving products from cache');
      return res.json(cachedResult);
    }

    console.log('🔄 Fetching products from database...');

    const clauses: string[] = [];
    const params: any[] = [];

    if (Number.isFinite(category)) {
      params.push(category);
      clauses.push(`category_id = $${params.length}`);
    }

    if (search && search.trim() !== "") {
      // use the same placeholder twice by pushing once and referencing same index
      params.push(`%${search}%`);
      const idx = params.length;
      clauses.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*) FROM products ${where}`;
    const dataSql = `
      SELECT * FROM products
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countRes = await pool.query(countSql, params);
    const total = Number(countRes.rows[0]?.count ?? 0);

    const dataRes = await pool.query(dataSql, [...params, limit, offset]);

    const response = { items: dataRes.rows, page, limit, total };
    
    // Cache the response for 60 seconds
    await cacheService.set(cacheKey, response, 60);
    console.log('💾 Products cached for 60 seconds');

    return res.json(response);
  } catch (err) {
    console.error("GET /api/products failed:", err);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
});

export default router;
