'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('BusinessHours', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      // 0 = Sunday, 1 = Monday, ... 6 = Saturday
      dayOfWeek: {
        type: Sequelize.TINYINT, // maps to SMALLINT in some dialects but behaves as tinyint-style enum for 0–6. [web:2]
        allowNull: false,
      },
      isOpen: {
        type: Sequelize.BOOLEAN, // stored as TINYINT(1) in MySQL. [web:3]
        allowNull: false,
        defaultValue: false,
      },
      openTime: {
        type: Sequelize.TIME,
        allowNull: true, // can be null when isOpen = false
      },
      closeTime: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      breakStart: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      breakEnd: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      effectiveDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      // optional: if you want to scope hours per provider/location later
      // serviceProviderId: {
      //   type: Sequelize.INTEGER,
      //   allowNull: true,
      //   references: {
      //     model: 'ServiceProviders',
      //     key: 'id',
      //   },
      //   onUpdate: 'CASCADE',
      //   onDelete: 'SET NULL',
      // },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('BusinessHours');
  },
};
