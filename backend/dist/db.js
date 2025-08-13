"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthDb = healthDb;
const pg_1 = require("pg");
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
exports.default = pool;
async function healthDb() {
    await pool.query("select 1");
}
