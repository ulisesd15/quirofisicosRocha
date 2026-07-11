'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ScheduleExceptions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.STRING
      },
      startDate: {
        type: Sequelize.DATE
      },
      endDate: {
        type: Sequelize.DATE
      },
      month: {
        type: Sequelize.INTEGER
      },
      day: {
        type: Sequelize.INTEGER
      },
      calculationRule: {
        type: Sequelize.STRING
      },
      customOpenTime: {
        type: Sequelize.STRING
      },
      customCloseTime: {
        type: Sequelize.STRING
      },
      reason: {
        type: Sequelize.TEXT
      },
      isActive: {
        type: Sequelize.BOOLEAN
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
    await queryInterface.dropTable('ScheduleExceptions');
  }
};