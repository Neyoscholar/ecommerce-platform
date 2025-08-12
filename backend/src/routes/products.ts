import { Router } from 'express';
import { pool } from '../db';
const router = Router();

router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  const offset = (page - 1) * limit;
  const category = req.query.category ? Number(req.query.category) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const clauses: string[] = []; const params: any[] = [];
  if (category) { params.push(category); clauses.push(`category_id = $${params.length}`); }
  if (search) { params.push(`%${search}%`); clauses.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) FROM products ${where}`;
  const dataSql  = `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;

  const countRes = await pool.query(countSql, params);
  const total = Number(countRes.rows[0].count);
  const dataRes = await pool.query(dataSql, [...params, limit, offset]);

  res.json({ items: dataRes.rows, page, limit, total });
});

export default router;