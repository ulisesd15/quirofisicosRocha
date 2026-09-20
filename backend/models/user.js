'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      this.hasMany(models.Appointment, {
        foreignKey: 'userId',
        as: 'appointments',
      });
    }
  }

  User.init(
    {
      fullName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'fullName',
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
        field: 'authProvider',
      },
      googleId: {
        type: DataTypes.STRING(255),
        field: 'googleId',
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
        field: 'isVerified',
      },
    },
    {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
}
  );

  return User;
};