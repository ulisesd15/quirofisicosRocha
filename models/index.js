'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Load all model files
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file !== 'associations.js' &&  // ✅ Skip the associations file
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// ✅ Define associations
const setupAssociations = require('./associations');
setupAssociations(db);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// ✅ Auto-sync database in development to fix "Unknown column" errors
if (env === 'development') {
  sequelize.sync({ alter: true, logging: false }).then(() => {
    console.log('✅ Database schema synchronized.');
  }).catch(err => {
    console.error('⚠️ Database sync failed:', err.message);
  });
}

module.exports = db;
