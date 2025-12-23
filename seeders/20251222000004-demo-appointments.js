// seeders/20251222000004-demo-appointments.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    await queryInterface.bulkInsert('appointments', [
      {
        fullName: 'Juan Pérez',
        email: 'juan@example.com',
        phone: '555-123-4567',
        date: tomorrowStr,
        time: '10:00:00',
        note: 'Primera consulta',
        userId: null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        fullName: 'María González',
        email: 'maria@example.com',
        phone: '555-987-6543',
        date: tomorrowStr,
        time: '11:00:00',
        note: 'Seguimiento',
        userId: 2,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('appointments', null, {});
  }
};
