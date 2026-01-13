'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BusinessHour extends Model {
  }

  BusinessHour.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      dayOfWeek: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: [['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']]
        }
      },
      isOpen: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      openTime: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      closeTime: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      effectiveDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'BusinessHour',
      tableName: 'business_hours',
      timestamps: true,
    }
  );

  return BusinessHour;
};
