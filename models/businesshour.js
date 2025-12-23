'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BusinessHour extends Model {
    static associate(models) {
      // Example association if you add FK later:
      // BusinessHour.belongsTo(models.ServiceProvider, {
      //   foreignKey: 'serviceProviderId',
      //   as: 'serviceProvider',
      // });
    }
  }

  BusinessHour.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      dayOfWeek: {
        type: DataTypes.TINYINT, // 0–6
        allowNull: false,
      },
      isOpen: {
        type: DataTypes.BOOLEAN, // mapped to tinyint-like boolean in SQL. [web:3][web:8]
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
      breakStart: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      breakEnd: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      effectiveDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      // serviceProviderId: {
      //   type: DataTypes.INTEGER,
      //   allowNull: true,
      // },
    },
    {
      sequelize,
      modelName: 'BusinessHour',
      tableName: 'BusinessHours',
      timestamps: true, // manages createdAt/updatedAt automatically. [web:6]
      underscored: false,
    }
  );

  return BusinessHour;
};
