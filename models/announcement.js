'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Announcement extends Model {
    static associate(models) {
      // no associations for now
    }
  }

  Announcement.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      endDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      priority: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'), // enum in model. [web:2][web:22]
        allowNull: false,
        defaultValue: 'LOW',
      },
    },
    {
      sequelize,
      modelName: 'Announcement',
      tableName: 'announcements',
      timestamps: true, // manages createdAt/updatedAt. [web:3][web:17]
    }
  );

  return Announcement;
};
