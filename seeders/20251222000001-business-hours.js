// seeders/20251222000001-business-hours.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const effectiveDate = new Date().toISOString().split('T')[0];
    
    await queryInterface.bulkInsert('business_hours', [
      {
        dayOfWeek: 'monday',
        openTime: '09:00:00',
        closeTime: '18:00:00',
        isOpen: true,
        effectiveDate: effectiveDate,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        dayOfWeek: 'tuesday',
        openTime: '09:00:00',
        closeTime: '18:00:00',
        isOpen: true,
        effectiveDate: effectiveDate,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        dayOfWeek: 'wednesday',
        openTime: '09:00:00',
        closeTime: '18:00:00',
        isOpen: true,
        effectiveDate: effectiveDate,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        dayOfWeek: 'thursday',
        openTime: '09:00:00',
        closeTime: '18:00:00',
        isOpen: true,
        effectiveDate: effectiveDate,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        dayOfWeek: 'friday',
        openTime: '09:00:00',
        closeTime: '18:00:00',
        isOpen: true,
        effectiveDate: effectiveDate,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        dayOfWeek: 'saturday',
        openTime: '09:00:00',
        closeTime: '14:00:00',
        isOpen: true,
        effectiveDate: effectiveDate,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        dayOfWeek: 'sunday',
        openTime: '00:00:00',
        closeTime: '00:00:00',
        isOpen: false,
        effectiveDate: effectiveDate,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('business_hours', null, {});
  }
};
