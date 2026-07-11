'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add startDate column to announcements table
    await queryInterface.addColumn('announcements', 'startDate', {
      type: Sequelize.DATE,
      allowNull: false,
      field: 'startDate', // Explicitly map to snakeCase
      defaultValue: Sequelize.NOW,
    });
    
    // Add endDate column to announcements table
    await queryInterface.addColumn('announcements', 'endDate', {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'endDate', // Explicitly map to snakeCase
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the columns if migration is rolled back
    await queryInterface.removeColumn('announcements', 'startDate');
    await queryInterface.removeColumn('announcements', 'endDate');
  }
};
