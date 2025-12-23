'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      fullName: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true, // unique email is common for users. [web:70][web:74]
      },

      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },

      password: {
        type: Sequelize.STRING(255),
        allowNull: true, // nullable for pure OAuth accounts
      },

      // 'user' | 'admin'
      role: {
        type: Sequelize.ENUM('user', 'admin'), // enum for roles. [web:22][web:21]
        allowNull: false,
        defaultValue: 'user',
      },

      // auth provider: 'local' | 'google' | 'github' | ...
      authProvider: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'local',
      },

      // generic external provider user id
      googleId: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      isVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    await queryInterface.dropTable('users');
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_users_role";'
      ); // clean up enum type on Postgres. [web:29][web:56]
    }
  },
};
