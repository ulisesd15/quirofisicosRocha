const mysql = require('mysql2');

// Parse JawsDB URL for production
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

// Add connection pooling for better performance
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

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
    connection.release();
  }
});

module.exports = pool;
