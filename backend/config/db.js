// This file creates ONE shared MySQL connection pool for the whole backend.
// A "pool" reuses a few connections instead of opening a new one every time,
// which is faster and simpler to manage.
//
// All values come from environment variables (the .env file), so we never
// hard-code passwords or database names in the source code.

const mysql = require('mysql2/promise');

// Hosted MySQL providers (Aiven, TiDB Cloud, PlanetScale, ...) require an
// encrypted connection. Set DB_SSL=true in the environment to turn TLS on.
const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'epress_cv_studio',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),
});

// Simple helper so other files can check that the database is reachable.
async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
}

module.exports = { pool, testConnection };
