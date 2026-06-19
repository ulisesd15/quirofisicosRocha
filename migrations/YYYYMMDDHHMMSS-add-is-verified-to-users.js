'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'isVerified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'role' // Optional: places the column after 'role' for organization
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'isVerified');
  }
};