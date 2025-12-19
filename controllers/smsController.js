/**
 * smsController.js
 *
 * Handles all SMS sending logic for Quirofísicos Rocha using the Vonage API.
 * - Sends appointment confirmations, reminders, and change notifications.
 * - Supports test/dev mode (logs instead of sending SMS in non-production).
 * - Centralizes SMS formatting and error handling.
 * - Exports a singleton instance for use in routes/controllers.
 */

const Vonage = require('@vonage/server-sdk');

// Initialize Vonage with environment variables
const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY || 'e392d934', 
  apiSecret: process.env.VONAGE_API_SECRET || 'M5NkXBw4x1MPmWQU'
});

class SMSController {
  /**
   * Initializes SMSController with config from environment variables.
   */
  constructor() {
    this.fromNumber = process.env.VONAGE_FROM_NUMBER || '16303298763';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Sends a test SMS (logs in dev mode, sends in production).
   */
  async sendTestSMS(to, message) {
    try {
      console.log('📱 Sending test SMS...');
      console.log('To:', to);
      console.log('From:', this.fromNumber);
      console.log('Message:', message);

      if (!this.isProduction) {
        console.log('🔧 Development mode: SMS would be sent in production');
        return {
          success: true,
          messageId: 'test-' + Date.now(),
          message: 'Test SMS logged (development mode)'
        };
      }

      const response = await vonage.sms.send({
        to: to,
        from: this.fromNumber,
        text: message
      });

      if (response.messages && response.messages[0] && response.messages[0].status === '0') {
        console.log('✅ K)Test SMS sent successfully');
        return {
          success: true,
          messageId: response.messages[0]['message-id'],
          message: 'SMS sent successfully'
        };
      } else {
        const error = response.messages[0]['error-text'] || 'Unknown error';
        console.error('❌ SMS send failed:', error);
        return {
          success: false,
          error: error
        };
      }

    } catch (error) {
      console.error('❌ Error sending test SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sends an appointment confirmation SMS to the user.
   */
  async sendAppointmentConfirmation(to, appointmentDetails) {
    const message = `Hola ${appointmentDetails.name}, tu cita en Quirofísicos Rocha ha sido confirmada para el ${appointmentDetails.date} a las ${appointmentDetails.time}. ¡Te esperamos!`;
    
    return await this.sendSMS(to, message);
  }

  /**
   * Sends an appointment reminder SMS to the user.
   */
  async sendAppointmentReminder(to, appointmentDetails) {    
    const message = `Recordatorio: Tienes una cita en Quirofísicos Rocha mañana ${appointmentDetails.date} a las ${appointmentDetails.time}. ¡Te esperamos!`;
    
    return await this.sendSMS(to, message);
  }

  /**
   * Sends an appointment change notification SMS to the user.
   */
  async sendAppointmentChange(to, appointmentDetails) {
    const message = `Tu cita en Quirofísicos Rocha ha sido modificada. Nueva fecha: ${appointmentDetails.date} a las ${appointmentDetails.time}. Para más información llama al consultorio.`;
    
    return await this.sendSMS(to, message);
  }

  /**
   * Sends a generic SMS (logs in dev mode, sends in production).
   */
  async sendSMS(to, message) {
    try {
      console.log('📱 Sending SMS...');
      console.log('To:', to);
      console.log('Message:', message);

      if (!this.isProduction) {
        console.log('🔧 Development mode: SMS logged instead of sent');
        return {
          success: true,
          messageId: 'dev-' + Date.now(),
          message: 'SMS logged (development mode)'
        };
      }

      const response = await vonage.sms.send({
        to: to,
        from: this.fromNumber,
        text: message
      });

      if (response.messages && response.messages[0] && response.messages[0].status === '0') {
        console.log('✅ SMS sent successfully');
        return {
          success: true,
          messageId: response.messages[0]['message-id']
        };
      } else {
        const error = response.messages[0]['error-text'] || 'Unknown error';
        console.error('❌ SMS send failed:', error);
        return {
          success: false,
          error: error
        };
      }

    } catch (error) {
      console.error('❌ Error sending SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Exports a singleton instance of SMSController for use in the app.
 */
module.exports = new SMSController();