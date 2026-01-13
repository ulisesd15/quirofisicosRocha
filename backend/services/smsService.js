/**
 * SMS Service - Handles SMS notifications for appointments and user verification
 * 
 * Features:
 * - Appointment reminders
 * - Appointment approval notifications
 * - User verification notifications
 * - SMS sending via Vonage (Nexmo)
 */

const { Vonage } = require('@vonage/server-sdk');
require('dotenv').config();

class SMSService {
  constructor() {
    // Check if Vonage credentials are properly configured
    const apiKey = process.env.VONAGE_API_KEY;
    const apiSecret = process.env.VONAGE_API_SECRET;
    this.fromNumber = process.env.VONAGE_FROM_NUMBER;
    
    // Only initialize Vonage if credentials are properly configured and not placeholders
    if (apiKey && apiSecret && this.fromNumber && 
        !apiKey.includes('your_') && !apiSecret.includes('your_') && !this.fromNumber.includes('your_')) {
      try {
        this.vonage = new Vonage({
          apiKey: apiKey,
          apiSecret: apiSecret
        });
        this.isConfigured = true;
        console.log('📱 SMS Service initialized with Vonage');
      } catch (error) {
        console.warn('⚠️ Vonage initialization failed, running in development mode:', error.message);
        this.isConfigured = false;
      }
    } else {
      console.log('📱 SMS Service running in development mode (Vonage not configured)');
      this.isConfigured = false;
    }
  }

  /**
   * Send SMS message
   * @param {string} to - Phone number to send to (international format)
   * @param {string} message - Message content
   * @returns {Promise} Vonage response
   */
  async sendSMS(to, message) {
    try {
      // Ensure phone number is in international format
      const formattedPhone = this.formatPhoneNumber(to);
      
      console.log(`📱 Sending SMS to ${formattedPhone}: ${message.substring(0, 50)}...`);
      
      // For development or when Vonage is not configured, just log
      if (!this.isConfigured || process.env.NODE_ENV === 'development') {
        console.log('📱 SMS (DEV MODE):', {
          to: formattedPhone,
          from: this.fromNumber || '+1234567890',
          text: message
        });
        return { messageId: 'dev_message_' + Date.now(), status: 'delivered' };
      }

      const result = await this.vonage.sms.send({
        to: formattedPhone,
        from: this.fromNumber,
        text: message
      });

      if (result.messages && result.messages[0]) {
        const msg = result.messages[0];
        if (msg.status === '0') {
          console.log(`✅ SMS sent successfully. Message ID: ${msg.messageId}`);
          return { messageId: msg.messageId, status: 'sent' };
        } else {
          throw new Error(`Vonage SMS failed: ${msg.errorText || 'Unknown error'}`);
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error sending SMS:', error);
      throw error;
    }
  }

  /**
   * Format phone number to international format
   * Handles both Mexican (+52) and US (+1) numbers
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phone) {
    // Remove all non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // If it already starts with +, return as is
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // If it starts with 52 and is 12 digits, it's Mexican
    if (cleanPhone.startsWith('52') && cleanPhone.length === 12) {
      return '+' + cleanPhone;
    }
    
    // If it starts with 1 and is 11 digits, it's US/Canada
    if (cleanPhone.startsWith('1') && cleanPhone.length === 11) {
      return '+' + cleanPhone;
    }
    
    // If it's 10 digits, determine if Mexican or US based on area code
    if (cleanPhone.length === 10) {
      const firstDigit = cleanPhone.charAt(0);
      const firstTwo = cleanPhone.substring(0, 2);
      
      // Mexican mobile area codes: 55 (Mexico City), 33 (Guadalajara), 81 (Monterrey), 
      // 664 (Tijuana), 662 (Hermosillo), etc.
      // US area codes typically: 212, 619, 213, 310, 415, etc.
      if (firstTwo === '55' || firstTwo === '33' || firstTwo === '81' || 
          firstDigit === '6' || firstDigit === '7' || firstDigit === '8' || firstDigit === '9') {
        return '+52' + cleanPhone; // Mexican number
      } else {
        return '+1' + cleanPhone; // US number
      }
    }
    
    // If it's 8 digits, likely Mexican without area code
    if (cleanPhone.length === 8) {
      return '+52664' + cleanPhone; // Default to Tijuana area code
    }
    
    // If none of the above, add + if not present
    if (!phone.startsWith('+')) {
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
