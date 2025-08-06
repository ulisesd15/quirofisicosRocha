const sequelize = require('../config/sequelize');

// Import models
const User = require('./User');
const Appointment = require('./Appointment');
const BusinessHours = require('./BusinessHours');

// Define relationships
User.hasMany(Appointment, { 
  foreignKey: 'user_id',
  as: 'appointments'
});

Appointment.belongsTo(User, { 
  foreignKey: 'user_id',
  as: 'user'
});

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Appointment,
  BusinessHours
};

// Test sync (only in development - this won't alter existing tables)
if (process.env.NODE_ENV !== 'production') {
  sequelize.sync({ alter: false, force: false })
    .then(() => {
      console.log('✅ Sequelize: Models synchronized (no changes to existing tables)');
    })
    .catch(error => {
      console.error('❌ Sequelize: Model sync error:', error.message);
    });
}
