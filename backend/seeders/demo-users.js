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
        id: 1,
        fullName: 'Admin Quirofisicos Rocha',
        email: 'admin@quirofisicosrocha.com',
        phone: '555-000-0000',
        password: adminPasswordHash,
        role: 'admin',
        authProvider: 'local',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        fullName: 'Ulises Quirofisicos Rocha',
        email: 'ulises@quirofisicosrocha.com',
        phone: '555-987-6543',
        password: userPasswordHash,
        role: 'admin',
        authProvider: 'local',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {
      updateOnDuplicate: ['fullName', 'password', 'role', 'isVerified', 'authProvider', 'updatedAt']
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};