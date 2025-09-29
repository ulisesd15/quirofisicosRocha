
/**
 * database.js
 *
 * Configures and exports a MySQL connection pool for the app.
 * Supports both local development and Heroku JawsDB (production) environments.
 * - Parses JawsDB URL for production
 * - Uses connection pooling for performance
 * - Tests connection on startup
 */

const mysql = require('mysql2');

/**
 * Parses a JawsDB MySQL URL into a config object for mysql2.
 * @param {string} url - The JawsDB connection URL
 * @returns {object|null} Parsed config or null if invalid
 */
function parseDbUrl(url) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (match) {
    return {
      host: match[3],
      user: match[1],
      password: match[2],
      database: match[5],
      port: match[4],
      ssl: { rejectUnauthorized: false }, // Required for JawsDB
      timezone: 'UTC',
      charset: 'utf8mb4'
    };
  }
  return null;
}


// Select DB config based on environment
let dbConfig;
if (process.env.NODE_ENV === 'production' && process.env.JAWSDB_URL) {
  // Production with JawsDB on Heroku
  console.log('🔗 Using JawsDB MySQL on Heroku');
  dbConfig = parseDbUrl(process.env.JAWSDB_URL);
} else {
  // Development environment
  console.log('🔗 Using local MySQL database');
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'kimpembe',
    database: process.env.DB_NAME || 'appointments_db',
    timezone: '-07:00',
    charset: 'utf8mb4'
  };
}


// Create a MySQL connection pool for efficient query handling
const poolConfig = {
  ...dbConfig,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

const pool = mysql.createPool(poolConfig);

/**
 * Tests the database connection on startup and logs the result.
 */
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
    connection.release();
  }
});

module.exports = pool;
