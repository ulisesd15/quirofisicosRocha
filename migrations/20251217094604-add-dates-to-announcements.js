'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add start_date column to announcements table
    await queryInterface.addColumn('announcements', 'start_date', {
      type: Sequelize.DATE,
      allowNull: false,
      field: 'start_date', // Explicitly map to snake_case
      defaultValue: Sequelize.NOW,
    });
    
    // Add end_date column to announcements table
    await queryInterface.addColumn('announcements', 'end_date', {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'end_date', // Explicitly map to snake_case
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the columns if migration is rolled back
    await queryInterface.removeColumn('announcements', 'start_date');
    await queryInterface.removeColumn('announcements', 'end_date');
  }
};
