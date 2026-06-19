'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Hash the specific passwords provided
    const adminPasswordHash = await bcrypt.hash('Password123!', 12);
    const userPasswordHash = await bcrypt.hash('ELdivino123!', 12);

    await queryInterface.bulkInsert('users', [
      {
        fullName: 'Admin Quirofisicos Rocha',
        email: 'admin@quirofisicosrocha.com',
        phone: '555-123-4567', // Example phone number
        password: adminPasswordHash,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        fullName: 'Ulises Quirofisicos Rocha',
        email: 'ulises@quirofisicosrocha.com',
        phone: '555-987-6543', // Example phone number
        password: userPasswordHash,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};