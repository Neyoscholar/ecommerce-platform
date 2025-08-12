"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthDb = healthDb;
// backend/src/db.ts
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL
    // ssl: { rejectUnauthorized: false } // keep commented for local dev
});
exports.default = pool;
// health check used by /healthz
async function healthDb() {
    await pool.query("select 1");
}
