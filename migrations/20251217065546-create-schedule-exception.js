'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('schedule_exceptions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      // 'CLOSURE' | 'OVERRIDE_HOURS' | 'BLOCK_SLOT'
      type: {
        type: Sequelize.ENUM('CLOSURE', 'OVERRIDE_HOURS', 'BLOCK_SLOT'), // enum usage in migrations. [web:25][web:21]
        allowNull: false,
      },

      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      // For OVERRIDE_HOURS only
      customOpenTime: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      customCloseTime: {
        type: Sequelize.TIME,
        allowNull: true,
      },

      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      isActive: {
        type: Sequelize.BOOLEAN, // maps to TINYINT(1) in MySQL. [web:33]
        allowNull: false,
        defaultValue: true,
      },

      // Recurrence / advanced rules (optional)
      isRecurring: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      recurringType: {
        type: Sequelize.STRING(255),
        allowNull: true, // e.g. 'WEEKLY','YEARLY'
      },
      month: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      day: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      calculationRule: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      // Optional: scope by provider/location in future
      // serviceProviderId: {
      //   type: Sequelize.INTEGER,
      //   allowNull: true,
      //   references: { model: 'ServiceProviders', key: 'id' },
      //   onUpdate: 'CASCADE',
      //   onDelete: 'SET NULL',
      // },

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

    // If you are replacing an old blockedtimeslots table, you would drop it in this migration:
    // await queryInterface.dropTable('blockedtimeslots');
  },

  down: async (queryInterface, Sequelize) => {
    // For Postgres, you must drop the enum type explicitly after dropping the table. [web:25][web:26]
    await queryInterface.dropTable('schedule_exceptions');
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_schedule_exceptions_type";'
      );
    }
  },
};
