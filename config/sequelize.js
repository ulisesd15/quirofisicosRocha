const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance using environment variables (same as your current setup)
const sequelize = new Sequelize(
  process.env.DB_NAME || 'appointments_db',
  process.env.DB_USER || 'root', 
  process.env.DB_PASSWORD,
  {
    host: 'localhost',
    dialect: 'mysql',
    timezone: '-07:00', // Adjust to your timezone
    logging: console.log, // Set to false in production
    
    define: {
      timestamps: true,
      underscored: false, // Use camelCase instead of snake_case
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test connection (optional - for development)
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize: Connection established successfully');
  } catch (error) {
    console.error('❌ Sequelize: Unable to connect to database:', error.message);
  }
};

// Only test connection in development
if (process.env.NODE_ENV !== 'production') {
  testConnection();
}

module.exports = sequelize;
