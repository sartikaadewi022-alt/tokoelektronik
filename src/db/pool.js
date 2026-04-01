import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT
});

pool.connect()
  .then(() => console.log('✅ Koneksi ke PostgreSQL berhasil'))
  .catch(err => console.error('❌ Gagal konek DB:', err.message));

export default pool;