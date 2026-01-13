'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Announcement extends Model {
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

      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'content', // Maps to the existing 'content' column in the database
      },

      announcementType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'info',
      },

      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      showOnHomepage: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      showOnBooking: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      priority: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'normal',
      },

      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
