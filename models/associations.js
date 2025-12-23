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
  // FUTURE ASSOCIATIONS - BUSINESS HOURS
  // ============================================================
  
  /**
   * BusinessHours tracking who created/updated them
   * Uncomment when you add createdBy/updatedBy columns to business_hours table
   */
  // if (User && BusinessHour) {
  //   // Track who created this business hour entry
  //   BusinessHour.belongsTo(User, { 
  //     foreignKey: 'createdBy', 
  //     as: 'creator',
  //     constraints: false // Don't enforce FK if column doesn't exist yet
  //   });
  //   
  //   // Track who last updated this business hour entry
  //   BusinessHour.belongsTo(User, { 
  //     foreignKey: 'updatedBy', 
  //     as: 'updater',
  //     constraints: false
  //   });
  //
  //   console.log('✅ User <-> BusinessHour associations loaded');
  // }

  // ============================================================
  // FUTURE ASSOCIATIONS - SCHEDULE EXCEPTIONS
  // ============================================================
  
  /**
   * ScheduleExceptions tracking who created them
   * Uncomment when you add createdBy column to schedule_exceptions table
   */
  // if (User && ScheduleException) {
  //   // User can create many schedule exceptions
  //   User.hasMany(ScheduleException, { 
  //     foreignKey: 'createdBy', 
  //     as: 'scheduleExceptions'
  //   });
  //   
  //   // Each schedule exception belongs to a creator
  //   ScheduleException.belongsTo(User, { 
  //     foreignKey: 'createdBy', 
  //     as: 'creator'
  //   });
  //
  //   console.log('✅ User <-> ScheduleException associations loaded');
  // }

  // ============================================================
  // FUTURE ASSOCIATIONS - ANNOUNCEMENTS
  // ============================================================
  
  /**
   * Announcements tracking who created them
   * Uncomment when you add createdBy column to announcements table
   */
  // if (User && Announcement) {
  //   // User can create many announcements
  //   User.hasMany(Announcement, { 
  //     foreignKey: 'createdBy', 
  //     as: 'announcements'
  //   });
  //   
  //   // Each announcement belongs to a creator
  //   Announcement.belongsTo(User, { 
  //     foreignKey: 'createdBy', 
  //     as: 'creator'
  //   });
  //
  //   console.log('✅ User <-> Announcement associations loaded');
  // }

  // ============================================================
  // FUTURE ASSOCIATIONS - APPOINTMENT HISTORY (Example)
  // ============================================================
  
  /**
   * Example: Track appointment status changes
   * Uncomment when you create an AppointmentHistory model
   */
  // if (Appointment && AppointmentHistory) {
  //   Appointment.hasMany(AppointmentHistory, {
  //     foreignKey: 'appointmentId',
  //     as: 'history',
  //     onDelete: 'CASCADE'
  //   });
  //   
  //   AppointmentHistory.belongsTo(Appointment, {
  //     foreignKey: 'appointmentId',
  //     as: 'appointment'
  //   });
  //   
  //   AppointmentHistory.belongsTo(User, {
  //     foreignKey: 'changedBy',
  //     as: 'changedByUser'
  //   });
  //
  //   console.log('✅ Appointment <-> AppointmentHistory associations loaded');
  // }

  console.log('✅ All associations setup complete');
}

module.exports = setupAssociations;
