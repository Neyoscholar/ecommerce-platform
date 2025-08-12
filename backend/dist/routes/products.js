"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/products.ts
const express_1 = require("express");
const db_1 = __importDefault(require("../db")); // <-- default export from db.ts
const router = (0, express_1.Router)();
/**
 * GET /api/products
 * Query params:
 *   - page   (number, default 1)
 *   - limit  (number, default 12, max 50)
 *   - category (number)
 *   - search  (string)
 */
router.get("/", async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page ?? 1));
        const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 12)));
        const offset = (page - 1) * limit;
        const category = req.query.category !== undefined ? Number(req.query.category) : undefined;
        const search = req.query.search !== undefined ? String(req.query.search) : undefined;
        const clauses = [];
        const params = [];
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
        const countRes = await db_1.default.query(countSql, params);
        const total = Number(countRes.rows[0]?.count ?? 0);
        const dataRes = await db_1.default.query(dataSql, [...params, limit, offset]);
        return res.json({ items: dataRes.rows, page, limit, total });
    }
    catch (err) {
        console.error("GET /api/products failed:", err);
        return res.status(500).json({ message: "Failed to fetch products" });
    }
});
exports.default = router;
