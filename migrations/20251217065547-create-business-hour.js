'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('business_hours', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      dayOfWeek: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Day name in lowercase: monday, tuesday, wednesday, etc.'
      },
      isOpen: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      openTime: {
        type: Sequelize.TIME,
        allowNull: true,
        comment: 'Format: HH:MM:SS'
      },
      closeTime: {
        type: Sequelize.TIME,
        allowNull: true,
        comment: 'Format: HH:MM:SS'
      },
      effectiveDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date when this schedule becomes active (YYYY-MM-DD)'
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

    // Add indexes for better query performance
    await queryInterface.addIndex('business_hours', ['effectiveDate', 'dayOfWeek'], {
      name: 'idx_effectivedate_dayofweek'
    });
    
    await queryInterface.addIndex('business_hours', ['dayOfWeek'], {
      name: 'idx_dayofweek'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('business_hours');
  },
};
