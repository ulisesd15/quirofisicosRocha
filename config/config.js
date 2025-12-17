require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'kimpembe',
    database: process.env.DB_NAME || 'appointments_db',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    timezone: '-07:00',
    define: {
      timestamps: true, // Automatically adds created_at and updated_at
      underscored: true, // Maps camelCase in models to snake_case in the database
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'kimpembe',
    database: process.env.DB_NAME_TEST || 'appointments_db_test',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false,
    define: {
      timestamps: true, // Automatically adds created_at and updated_at
      underscored: true, // Maps camelCase in models to snake_case in the database
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'mysql',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};