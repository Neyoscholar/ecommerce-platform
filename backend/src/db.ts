import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export default pool;

export async function healthDb(): Promise<void> {
  await pool.query("select 1");
}
