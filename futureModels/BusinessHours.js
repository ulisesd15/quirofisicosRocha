const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const BusinessHours = sequelize.define('BusinessHours', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  day_of_week: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']]
    }
  },
  is_open: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  open_time: {
    type: DataTypes.TIME,
    allowNull: true,
    validate: {
      is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/ // HH:MM:SS format
    }
  },
  close_time: {
    type: DataTypes.TIME,
    allowNull: true,
    validate: {
      is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/ // HH:MM:SS format
    }
  },
  break_start: {
    type: DataTypes.TIME,
    allowNull: true,
    validate: {
      is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/ // HH:MM:SS format
    }
  },
  break_end: {
    type: DataTypes.TIME,
    allowNull: true,
    validate: {
      is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/ // HH:MM:SS format
    }
  }
}, {
  tableName: 'business_hours',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = BusinessHours;
