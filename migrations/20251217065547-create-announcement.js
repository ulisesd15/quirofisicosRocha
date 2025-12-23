'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('announcements', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      endDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      isActive: {
        type: Sequelize.BOOLEAN, // stored as TINYINT(1) for MySQL/SQLite. [web:33][web:53]
        allowNull: false,
        defaultValue: true,
      },

      priority: {
        type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH'), // enum data type. [web:2][web:21]
        allowNull: false,
        defaultValue: 'LOW', // default enum value. [web:39][web:23]
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('announcements');
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_announcements_priority";'
      ); // clean enum type for Postgres. [web:29][web:56]
    }
  },
};
