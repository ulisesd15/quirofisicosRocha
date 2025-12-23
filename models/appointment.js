'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Appointment extends Model {
    static associate(models) {
      Appointment.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  Appointment.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      fullName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      phone: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      startDateTime: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      endDateTime: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM(
          'BOOKED',
          'CANCELLED',
          'NO_SHOW',
          'COMPLETED'
        ), // enum on model side. [web:23][web:25]
        allowNull: false,
        defaultValue: 'BOOKED',
      },
    },
    {
      sequelize,
      modelName: 'Appointment',
      tableName: 'appointments',
      timestamps: true, // auto-handles createdAt/updatedAt. [web:3][web:40]
    }
  );

  return Appointment;
};
