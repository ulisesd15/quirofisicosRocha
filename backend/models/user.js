'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // A user can have many appointments
      this.hasMany(models.Appointment, {
        foreignKey: 'userId',
        as: 'appointments',
      });
    }

    // See Appointment.toJSON() for why this is needed: `underscored: true`
    // does not camelCase the built-in timestamp attributes on output.
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

  User.init(
    {
      fullName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'fullName',         // map to DB column
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      phone: {
        type: DataTypes.STRING(20),
      },
      password: {
        type: DataTypes.STRING(255),
      },
      authProvider: {
        type: DataTypes.STRING(50),
        defaultValue: 'local',
        field: 'authProvider',     // map to DB column
      },
      googleId: {
        type: DataTypes.STRING(255),
        field: 'googleId',         // map to DB column
      },
      role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user',
        allowNull: false,
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',           // match migration
      underscored: true,            // createdAt / updatedAt
    }
  );

  return User;
};
