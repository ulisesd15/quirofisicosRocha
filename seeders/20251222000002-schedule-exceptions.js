// seeders/20251222000002-schedule-exceptions.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const currentYear = new Date().getFullYear();
    
    await queryInterface.bulkInsert('schedule_exceptions', [
      {
        name: 'Año Nuevo',
        type: 'CLOSURE',
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-01-01`,
        isActive: true,
        reason: 'Día festivo nacional',
        isRecurring: true,
        recurringType: 'YEARLY',
        month: 1,
        day: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Día de Navidad',
        type: 'CLOSURE',
        startDate: `${currentYear}-12-25`,
        endDate: `${currentYear}-12-25`,
        isActive: true,
        reason: 'Día festivo nacional',
        isRecurring: true,
        recurringType: 'YEARLY',
        month: 12,
        day: 25,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('schedule_exceptions', null, {});
  }
};
