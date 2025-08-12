"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const db_1 = __importDefault(require("../db")); // <-- default export from db.ts
// ---------- helpers ----------
function requireJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET not set");
    }
    return secret;
}
// ---------- register ----------
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
});
async function register(req, res) {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid input" });
        }
        const { email, password, firstName, lastName } = parsed.data;
        const hash = await bcrypt_1.default.hash(password, 10);
        const insertSql = `
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, role
    `;
        const { rows } = await db_1.default.query(insertSql, [
            email,
            hash,
            firstName,
            lastName,
        ]);
        const user = rows[0];
        const token = jsonwebtoken_1.default.sign(user, requireJwtSecret(), { expiresIn: "7d" });
        return res.status(201).json({ user, token });
    }
    catch (e) {
        // unique_violation in Postgres
        if (e?.code === "23505") {
            return res.status(409).json({ message: "Email exists" });
        }
        console.error("register failed:", e);
        return res.status(500).json({ message: "Registration failed" });
    }
}
// ---------- login ----------
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
async function login(req, res) {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid input" });
        }
        const { email, password } = parsed.data;
        const { rows } = await db_1.default.query("SELECT id, email, password_hash, role FROM users WHERE email = $1", [email]);
        const user = rows[0];
        if (!user)
            return res.status(401).json({ message: "Invalid credentials" });
        const ok = await bcrypt_1.default.compare(password, user.password_hash);
        if (!ok)
            return res.status(401).json({ message: "Invalid credentials" });
        const payload = { id: user.id, email: user.email, role: user.role };
        const token = jsonwebtoken_1.default.sign(payload, requireJwtSecret(), { expiresIn: "7d" });
        return res.json({ user: payload, token });
    }
    catch (e) {
        console.error("login failed:", e);
        return res.status(500).json({ message: "Login failed" });
    }
}
