'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Appointment extends Model {
    static associate(models) {
      // Each appointment belongs to one user
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  Appointment.init(
    {
      fullName: {
        type: DataTypes.STRING,
        field: 'fullName',
      },
      email: DataTypes.STRING,
      phone: DataTypes.STRING,
      date: DataTypes.DATE,
      time: DataTypes.TIME,
      note: DataTypes.TEXT,
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        field: 'userId',
      },
    },
    {
      sequelize,
      modelName: 'Appointment',
      tableName: 'appointments',   // match migration
      underscored: true,           // createdAt / updatedAt
    }
  );

  return Appointment;
};
