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

    // With `underscored: true`, the auto-generated timestamp attributes come
    // back from Sequelize keyed by their raw DB column names (created_at /
    // updated_at) rather than the camelCase attribute names, unlike explicitly
    // `field`-mapped attributes (fullName, userId) which DO serialize with
    // their camelCase key. Confirmed via live API testing — every JSON
    // consumer of this model (routes, frontend) expects camelCase, so
    // normalize it once here instead of patching every route.
    toJSON() {
      const values = { ...this.get() };
      if ('created_at' in values) {
        values.createdAt = values.created_at;
        delete values.created_at;
      }
      if ('updated_at' in values) {
        values.updatedAt = values.updated_at;
        delete values.updated_at;
      }
      return values;
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
