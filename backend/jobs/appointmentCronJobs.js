/**
 * appointmentCronJobs.js
 * Scheduled tasks for appointment management
 */

const cron = require('node-cron');
const appointmentStatusService = require('../services/appointmentStatusService');

/**
 * Runs daily at 12:05 AM to update appointment statuses
 */
function startAppointmentStatusUpdater() {
  // Run every day at 12:05 AM
  cron.schedule('5 0 * * *', async () => {
    console.log('🔄 Running daily appointment status update...');
    try {
      await appointmentStatusService.updatePastAppointments();
      await appointmentStatusService.cancelOldPendingAppointments(7);
      console.log('✅ Daily appointment status update completed');
    } catch (error) {
      console.error('❌ Daily appointment status update failed:', error);
    }
  });

  console.log('⏰ Appointment status updater scheduled (runs daily at 12:05 AM)');
}

/**
 * Manual trigger for testing purposes
 */
async function runManualUpdate() {
  console.log('🔄 Running manual appointment status update...');
  try {
    const result = await appointmentStatusService.updatePastAppointments();
    await appointmentStatusService.cancelOldPendingAppointments(7);
    console.log('✅ Manual update completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Manual update failed:', error);
    throw error;
  }
}

module.exports = {
  startAppointmentStatusUpdater,
  runManualUpdate
};
