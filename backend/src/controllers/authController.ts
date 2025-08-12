import { Request, Response } from 'express';
import { pool } from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(), password: z.string().min(8),
  firstName: z.string().min(1), lastName: z.string().min(1)
});

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  const { email, password, firstName, lastName } = parsed.data;
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      'INSERT INTO users(email, password_hash, first_name, last_name) VALUES($1,$2,$3,$4) RETURNING id, email, role',
      [email, hash, firstName, lastName]
    );
    const user = rows[0];
    const token = jwt.sign(user, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (e:any) {
    if (e.code === '23505') return res.status(409).json({ message: 'Email exists' });
    throw e;
  }
}

const loginSchema = z.object({ email: z.string().email(), password: z.string() });
export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
  const { email, password } = parsed.data;
  const { rows } = await pool.query('SELECT id, email, password_hash, role FROM users WHERE email=$1', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const payload = { id: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '7d' });
  res.json({ user: payload, token });
}