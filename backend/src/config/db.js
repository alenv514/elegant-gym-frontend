import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

// Configuration reads from DATABASE_URL env var
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false, // Enable SSL validation for Supabase in cloud, disable locally if needed
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Helper to execute queries without managing client lifecycle manually
export const query = (text, params) => pool.query(text, params)

export default pool
