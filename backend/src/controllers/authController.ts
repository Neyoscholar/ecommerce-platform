// backend/src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import pool from "../db"; // <-- default export from db.ts

// ---------- helpers ----------
function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET not set");
  }
  return secret;
}

// ---------- register ----------
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export async function register(req: Request, res: Response) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const { email, password, firstName, lastName } = parsed.data;
    const hash = await bcrypt.hash(password, 10);

    const insertSql = `
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, role
    `;
    const { rows } = await pool.query(insertSql, [
      email,
      hash,
      firstName,
      lastName,
    ]);

    const user = rows[0];
    const token = jwt.sign(user, requireJwtSecret(), { expiresIn: "7d" });
    return res.status(201).json({ user, token });
  } catch (e: any) {
    // unique_violation in Postgres
    if (e?.code === "23505") {
      return res.status(409).json({ message: "Email exists" });
    }
    console.error("register failed:", e);
    return res.status(500).json({ message: "Registration failed" });
  }
}

// ---------- login ----------
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const { email, password } = parsed.data;
    const { rows } = await pool.query(
      "SELECT id, email, password_hash, role FROM users WHERE email = $1",
      [email]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const payload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, requireJwtSecret(), { expiresIn: "7d" });
    return res.json({ user: payload, token });
  } catch (e) {
    console.error("login failed:", e);
    return res.status(500).json({ message: "Login failed" });
  }
}
