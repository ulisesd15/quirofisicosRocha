'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('appointments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      fullName: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      phone: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      startDateTime: {
        type: Sequelize.DATE, // maps to DATETIME/TIMESTAMP depending on dialect. [web:44][web:2]
        allowNull: false,
      },

      endDateTime: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      status: {
        type: Sequelize.ENUM(
          'BOOKED',
          'CANCELLED',
          'NO_SHOW',
          'COMPLETED'
        ), // enum with allowed values. [web:23][web:25]
        allowNull: false,
        defaultValue: 'BOOKED', // valid default from enum set. [web:39][web:23]
      },

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

    // If you are migrating from old schema with separate date/time columns,
    // you would add an ALTER TABLE or data-migration step in a separate migration.
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('appointments');
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_appointments_status";'
      ); // clean up enum type in Postgres. [web:29][web:41]
    }
  },
};
