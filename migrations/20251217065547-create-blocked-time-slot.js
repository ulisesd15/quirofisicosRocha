'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // This file is restored to fix a "missing migration" error during undo.
  },

  down: async (queryInterface, Sequelize) => {
    // Attempt to drop the old table if it exists
    await queryInterface.dropTable('blocked_time_slots').catch(() => {});
  }
};