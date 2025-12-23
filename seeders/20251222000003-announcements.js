// seeders/20251222000003-announcements.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('announcements', [
      {
        title: 'Bienvenidos',
        content: 'Bienvenidos a Quirofísicos Rocha. Estamos aquí para ayudarle con su bienestar.',
        priority: 1,
        isActive: true,
        startDate: new Date(),
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Horario de Atención',
        content: 'Atendemos de lunes a viernes de 9:00 AM a 6:00 PM, y sábados de 9:00 AM a 2:00 PM.',
        priority: 2,
        isActive: true,
        startDate: new Date(),
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('announcements', null, {});
  }
};
