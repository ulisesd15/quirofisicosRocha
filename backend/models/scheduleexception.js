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
        field: 'startDate'
      },
      endDate: {
        type: DataTypes.DATE,
        field: 'endDate'
      },
      month: DataTypes.INTEGER,
      day: DataTypes.INTEGER,
      calculationRule: {
        type: DataTypes.STRING,
        field: 'calculationRule'
      },
      customOpenTime: {
        type: DataTypes.TIME,
        field: 'customOpenTime'
      },
      customCloseTime: {
        type: DataTypes.TIME,
        field: 'customCloseTime'
      },
      reason: DataTypes.TEXT,
      isActive: {
        type: DataTypes.BOOLEAN,
        field: 'isActive',
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'ScheduleException',
      tableName: 'scheduleExceptions',
      underscored: true
    }
  );

  return ScheduleException;
};
