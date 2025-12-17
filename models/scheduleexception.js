'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ScheduleException extends Model {
    static associate(models) {
      // define association here if needed later
    }
  }

  ScheduleException.init(
    {
      name: {
        type: DataTypes.STRING
      },
      type: {
        type: DataTypes.ENUM('BLOCK', 'CUSTOM_HOURS', 'YEARLY_FIXED', 'YEARLY_CALCULATED'),
        allowNull: false
      },
      startDate: {
        type: DataTypes.DATE,
        field: 'start_date'
      },
      endDate: {
        type: DataTypes.DATE,
        field: 'end_date'
      },
      month: DataTypes.INTEGER,
      day: DataTypes.INTEGER,
      calculationRule: {
        type: DataTypes.STRING,
        field: 'calculation_rule'
      },
      customOpenTime: {
        type: DataTypes.TIME,
        field: 'custom_open_time'
      },
      customCloseTime: {
        type: DataTypes.TIME,
        field: 'custom_close_time'
      },
      reason: DataTypes.TEXT,
      isActive: {
        type: DataTypes.BOOLEAN,
        field: 'is_active',
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'ScheduleException',
      tableName: 'schedule_exceptions',
      underscored: true
    }
  );

  return ScheduleException;
};
