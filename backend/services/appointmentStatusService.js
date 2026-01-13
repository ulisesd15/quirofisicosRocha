/**
 * appointmentStatusService.js
 * Service for managing automatic appointment status updates
 */

const { Appointment, sequelize } = require('../models');
const { Op } = require('sequelize');

class AppointmentStatusService {
  /**
   * Updates past appointments to 'completed' status
   * Called by cron job daily
   */
  async updatePastAppointments() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
    
    try {
      const result = await sequelize.transaction(async (t) => {
        // Update appointments from previous days
        const pastDays = await Appointment.update(
          { status: 'completed' },
          {
            where: {
              date: { [Op.lt]: today },
              status: { [Op.in]: ['pending', 'confirmed'] }
            },
            transaction: t
          }
        );

        // Update appointments from today that have passed
        const pastToday = await Appointment.update(
          { status: 'completed' },
          {
            where: {
              date: today,
              time: { [Op.lt]: currentTime },
              status: { [Op.in]: ['pending', 'confirmed'] }
            },
            transaction: t
          }
        );

        return {
          pastDays: pastDays[0],
          pastToday: pastToday[0],
          total: pastDays[0] + pastToday[0]
        };
      });

      console.log(`✅ Updated ${result.total} past appointments to 'completed' status`);
      console.log(`   - Previous days: ${result.pastDays}`);
      console.log(`   - Today: ${result.pastToday}`);
      
      return result;
    } catch (error) {
      console.error('❌ Error updating past appointments:', error);
      throw error;
    }
  }

  /**
   * Cancels old pending appointments (older than 7 days)
   * Called by cron job daily
   */
  async cancelOldPendingAppointments(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    try {
      const result = await Appointment.update(
        { 
          status: 'cancelled',
          note: sequelize.fn('CONCAT', sequelize.col('note'), '\n[Auto-cancelled: No confirmation received]')
        },
        {
          where: {
            date: { [Op.lt]: cutoffDateStr },
            status: 'pending'
          }
        }
      );

      console.log(`✅ Auto-cancelled ${result[0]} old pending appointments`);
      return result[0];
    } catch (error) {
      console.error('❌ Error cancelling old pending appointments:', error);
      throw error;
    }
  }

  /**
   * Gets appointment classification (past, today, upcoming)
   * Used for display purposes
   */
  classifyAppointment(appointment) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];
    
    const apptDate = appointment.date;
    const apptTime = appointment.time;
    
    // Check if appointment has passed
    if (apptDate < today || (apptDate === today && apptTime < currentTime)) {
      return 'past';
    }
    
    // Check if appointment is today but upcoming
    if (apptDate === today) {
      return 'today';
    }
    
    // Future appointment
    return 'upcoming';
  }

  /**
   * Gets appointments with their classification
   * Useful for frontend display
   */
  async getClassifiedAppointments(whereClause = {}) {
    const appointments = await Appointment.findAll({
      where: whereClause,
      order: [['date', 'DESC'], ['time', 'DESC']]
    });

    return appointments.map(apt => {
      const plain = apt.get({ plain: true });
      plain.classification = this.classifyAppointment(apt);
      return plain;
    });
  }
}

module.exports = new AppointmentStatusService();
