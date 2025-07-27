/**
 * SMS Service - Handles SMS notifications for appointments and user verification
 * 
 * Features:
 * - Appointment reminders
 * - Appointment approval notifications
 * - User verification notifications
 * - SMS sending via Twilio
 */

const twilio = require('twilio');
require('dotenv').config();

class SMSService {
  constructor() {
    // Check if Twilio credentials are properly configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    // Only initialize Twilio if credentials are properly configured
    if (accountSid && accountSid.startsWith('AC') && authToken && this.fromNumber) {
      try {
        this.client = twilio(accountSid, authToken);
        this.isConfigured = true;
        console.log('📱 SMS Service initialized with Twilio');
      } catch (error) {
        console.warn('⚠️ Twilio initialization failed, running in development mode:', error.message);
        this.isConfigured = false;
      }
    } else {
      console.log('📱 SMS Service running in development mode (Twilio not configured)');
      this.isConfigured = false;
    }
  }

  /**
   * Send SMS message
   * @param {string} to - Phone number to send to (international format)
   * @param {string} message - Message content
   * @returns {Promise} Twilio response
   */
  async sendSMS(to, message) {
    try {
      // Ensure phone number is in international format
      const formattedPhone = this.formatPhoneNumber(to);
      
      console.log(`📱 Sending SMS to ${formattedPhone}: ${message.substring(0, 50)}...`);
      
      // For development or when Twilio is not configured, just log
      if (!this.isConfigured || process.env.NODE_ENV === 'development') {
        console.log('📱 SMS (DEV MODE):', {
          to: formattedPhone,
          from: this.fromNumber || '+1234567890',
          body: message
        });
        return { sid: 'dev_message_' + Date.now(), status: 'sent' };
      }

      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedPhone
      });

      console.log(`✅ SMS sent successfully. SID: ${result.sid}`);
      return result;
    } catch (error) {
      console.error('❌ Error sending SMS:', error);
      throw error;
    }
  }

  /**
   * Format phone number to international format
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phone) {
    // Remove all non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // If it starts with 52 (Mexico), add +
    if (cleanPhone.startsWith('52') && cleanPhone.length === 12) {
      return '+' + cleanPhone;
    }
    
    // If it's 10 digits, assume it's Mexican and add +52
    if (cleanPhone.length === 10) {
      return '+52' + cleanPhone;
    }
    
    // If it already has country code but no +, add it
    if (cleanPhone.length > 10 && !phone.startsWith('+')) {
      return '+' + cleanPhone;
    }
    
    return phone;
  }

  /**
   * Send appointment reminder SMS
   * @param {Object} appointment - Appointment details
   * @param {Object} user - User details
   */
  async sendAppointmentReminder(appointment, user) {
    const appointmentDate = new Date(appointment.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = `🏥 Recordatorio de cita - Quirofísicos Rocha
    
Hola ${user.full_name},

Le recordamos su cita programada para:
📅 ${formattedDate}
🕐 ${formattedTime}

Por favor, llegue 10 minutos antes de su cita.

Si necesita reagendar, contáctenos al (664) 123-4567.

¡Nos vemos pronto!`;

    return await this.sendSMS(user.phone, message);
  }

  /**
   * Send appointment approval notification
   * @param {Object} appointment - Appointment details
   * @param {Object} user - User details
   */
  async sendAppointmentApproval(appointment, user) {
    const appointmentDate = new Date(appointment.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = `✅ Cita Aprobada - Quirofísicos Rocha

Hola ${user.full_name},

Su cita ha sido APROBADA:
📅 ${formattedDate}
🕐 ${formattedTime}
🏥 Motivo: ${appointment.reason}

Por favor, llegue 10 minutos antes de su cita.

¡Esperamos verle pronto!`;

    return await this.sendSMS(user.phone, message);
  }

  /**
   * Send user verification notification
   * @param {Object} user - User details
   */
  async sendUserVerification(user) {
    const message = `🎉 Cuenta Verificada - Quirofísicos Rocha

Hola ${user.full_name},

Su cuenta ha sido verificada exitosamente. 

Ya puede agendar citas a través de nuestro sistema en línea.

Visite: ${process.env.WEBSITE_URL || 'https://quirofisicosrocha.com'}

¡Bienvenido!`;

    return await this.sendSMS(user.phone, message);
  }

  /**
   * Send new user registration notification to admin
   * @param {Object} user - User details
   */
  async sendNewUserNotificationToAdmin(user) {
    const adminPhone = process.env.ADMIN_PHONE_NUMBER;
    if (!adminPhone) return;

    const message = `🔔 Nuevo Usuario Registrado - Quirofísicos Rocha

Nuevo usuario requiere verificación:

👤 Nombre: ${user.full_name}
📧 Email: ${user.email}
📱 Teléfono: ${user.phone}
📅 Registrado: ${new Date().toLocaleDateString('es-MX')}

Ingrese al panel de administración para verificar al usuario.`;

    return await this.sendSMS(adminPhone, message);
  }

  /**
   * Send appointment request notification to admin
   * @param {Object} appointment - Appointment details
   * @param {Object} user - User details
   */
  async sendAppointmentRequestToAdmin(appointment, user) {
    const adminPhone = process.env.ADMIN_PHONE_NUMBER;
    if (!adminPhone) return;

    const appointmentDate = new Date(appointment.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('es-MX');
    const formattedTime = appointmentDate.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = `📋 Nueva Solicitud de Cita - Quirofísicos Rocha

👤 Paciente: ${user.full_name}
📱 Teléfono: ${user.phone}
📅 Fecha: ${formattedDate}
🕐 Hora: ${formattedTime}
🏥 Motivo: ${appointment.reason}

${user.is_verified ? 'Usuario verificado' : '⚠️ Usuario NO verificado - requiere verificación'}

Revise el panel de administración para aprobar.`;

    return await this.sendSMS(adminPhone, message);
  }
}

module.exports = new SMSService();
