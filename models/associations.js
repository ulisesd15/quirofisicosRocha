'use strict';

/**
 * associations.js
 * 
 * Centralized association definitions for all Sequelize models.
 * This keeps model files clean and makes relationships easy to manage.
 * 
 * Association Types:
 * - hasMany: One-to-Many relationship (parent has multiple children)
 * - belongsTo: Many-to-One relationship (child belongs to parent)
 * - hasOne: One-to-One relationship
 * - belongsToMany: Many-to-Many relationship (requires junction table)
 */

/**
 * Setup all model associations
 * @param {Object} db - Database object containing all models
 */
function setupAssociations(db) {
  const { User, Appointment, BusinessHour, ScheduleException, Announcement } = db;

  // ============================================================
  // USER <-> APPOINTMENT ASSOCIATIONS
  // ============================================================
  
  /**
   * User can have many appointments
   * When a user is deleted, their appointments are set to NULL (orphaned)
   */
  if (User && Appointment) {
    User.hasMany(Appointment, { 
      foreignKey: 'userId',
      as: 'appointments',
      onDelete: 'SET NULL',
      hooks: true
    });

    /**
     * Each appointment belongs to a user (optional)
     * Guest appointments have userId = NULL
     */
    Appointment.belongsTo(User, { 
      foreignKey: 'userId',
      as: 'user'
    });

    console.log('✅ User <-> Appointment associations loaded');
  }

  // ============================================================
  // ANNOUNCEMENTS ASSOCIATIONS
  // ============================================================
  
  if (User && Announcement) {
    // User can create many announcements
    User.hasMany(Announcement, { 
      foreignKey: 'createdBy', 
      as: 'announcements'
    });
    
    // Each announcement belongs to a creator
    Announcement.belongsTo(User, { 
      foreignKey: 'createdBy', 
      as: 'creator'
    });

    console.log('✅ User <-> Announcement associations loaded');
  }

  console.log('✅ All associations setup complete');
}

module.exports = setupAssociations;
