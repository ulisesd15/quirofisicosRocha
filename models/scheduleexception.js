'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ScheduleException extends Model {
    static associate(models) {
      // Example if you add a foreign key later:
      // ScheduleException.belongsTo(models.ServiceProvider, {
      //   foreignKey: 'serviceProviderId',
      //   as: 'serviceProvider',
      // });
    }
  }

  ScheduleException.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      type: {
        type: DataTypes.ENUM('CLOSURE', 'OVERRIDE_HOURS', 'BLOCK_SLOT'), // enum usage in models. [web:25][web:23]
        allowNull: false,
      },

      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      customOpenTime: {
        type: DataTypes.TIME,
        allowNull: true,
      },

      customCloseTime: {
        type: DataTypes.TIME,
        allowNull: true,
      },

      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      isActive: {
        type: DataTypes.BOOLEAN, // boolean backed by tinyint(1) for MySQL/SQLite. [web:33]
        allowNull: false,
        defaultValue: true,
      },

      isRecurring: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },

      recurringType: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      month: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      day: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      calculationRule: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      // serviceProviderId: {
      //   type: DataTypes.INTEGER,
      //   allowNull: true,
      // },
    },
    {
      sequelize,
      modelName: 'ScheduleException',
      tableName: 'schedule_exceptions',
      timestamps: true, // adds createdAt / updatedAt. [web:4]
    }
  );

  return ScheduleException;
};
