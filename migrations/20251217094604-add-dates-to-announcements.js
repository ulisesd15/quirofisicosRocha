'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * This migration is intentionally left empty to resolve a conflict
     * with sequelize.sync() which already created the columns.
     */
  },

  async down (queryInterface, Sequelize) {
    /**
     * No rollback action is needed.
     */
  }
};