'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BusinessHours', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      effectiveDate: {
        type: Sequelize.DATE
      },
      dayOfWeek: {
        type: Sequelize.STRING
      },
      isOpen: {
        type: Sequelize.BOOLEAN
      },
      openTime: {
        type: Sequelize.STRING
      },
      closeTime: {
        type: Sequelize.STRING
      },
      breakStart: {
        type: Sequelize.STRING
      },
      breakEnd: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('BusinessHours');
  }
};