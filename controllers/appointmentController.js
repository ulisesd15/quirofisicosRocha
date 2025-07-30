/**
 * Appointment Controller - Enhanced with SMS notifications and user verification
 * 
 * Features:
 * - Appointment booking with user verification checks
 * - Appointment approval system
 * - SMS notifications for appointments and user verification
 * - Admin approval workflow
 */

const db = require('../config/connections');
const smsService = require('../services/smsService');

const appointmentController = {
  // Create a new appointment
  createAppointment: async (req, res) => {
    try {
      const { full_name, email, phone, date, time, note, reason } = req.body;
      const user_id = req.user ? req.user.id : null;

      // Validate required fields
      if (!full_name || !phone || !date || !time) {
        return res.status(400).json({ 
          error: 'Nombre, teléfono, fecha y hora son requeridos' 
        });
      }

      // Check if user is registered and verified
      let user = null;
      let requiresApproval = true;

      if (user_id) {
        // Get user information
        const userQuery = 'SELECT * FROM users WHERE id = ?';
        const [userResults] = await db.promise().query(userQuery, [user_id]);
        
        if (userResults.length > 0) {
          user = userResults[0];
          
          // If user is verified, appointment doesn't need approval
          if (user.is_verified) {
            requiresApproval = false;
          }
        }
      } else if (email) {
        // Check if email exists in system
        const emailQuery = 'SELECT * FROM users WHERE email = ?';
        const [emailResults] = await db.promise().query(emailQuery, [email]);
        
        if (emailResults.length > 0) {
          user = emailResults[0];
          requiresApproval = !user.is_verified;
        }
      }

      // Create appointment
      const appointmentQuery = `
        INSERT INTO appointments 
        (full_name, email, phone, date, time, note, user_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const status = requiresApproval ? 'pending' : 'confirmed';
      const appointmentValues = [
        full_name, email, phone, date, time, note, user_id, status
      ];

      const [result] = await db.promise().query(appointmentQuery, appointmentValues);
      const appointmentId = result.insertId;

      // Get the created appointment
      const getAppointmentQuery = 'SELECT * FROM appointments WHERE id = ?';
      const [appointmentResults] = await db.promise().query(getAppointmentQuery, [appointmentId]);
      const appointment = appointmentResults[0];

      // Send SMS notifications
      try {
        if (user) {
          // Send notification to admin about new appointment
          await smsService.sendAppointmentRequestToAdmin(appointment, user);

          // If user is not verified, send notification to admin about verification needed
          if (!user.is_verified && user.requires_verification) {
            await smsService.sendNewUserNotificationToAdmin(user);
          }

          // If appointment is approved immediately, send approval SMS
          if (!requiresApproval) {
            await smsService.sendAppointmentApproval(appointment, user);
            
            // Update SMS sent flag
            await db.promise().query(
              'UPDATE appointments SET approval_sms_sent = TRUE WHERE id = ?',
              [appointmentId]
            );
          }
        }
      } catch (smsError) {
        console.error('Error sending SMS notifications:', smsError);
        // Don't fail the appointment creation if SMS fails
      }

      res.status(201).json({
        message: requiresApproval 
          ? 'Cita creada. Pendiente de aprobación.' 
          : 'Cita confirmada exitosamente.',
        appointment: {
          id: appointmentId,
          ...appointment,
          requires_approval: requiresApproval
        }
      });

    } catch (error) {
      console.error('Error creating appointment:', error);
      res.status(500).json({ error: 'Error al crear la cita' });
    }
  },

  // Approve an appointment (admin only)
  approveAppointment: async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user.id;

      // Get appointment details
      const appointmentQuery = `
        SELECT a.*, u.full_name as user_name, u.phone as user_phone, u.email as user_email, u.is_verified
        FROM appointments a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.id = ?
      `;
      
      const [appointmentResults] = await db.promise().query(appointmentQuery, [id]);
      
      if (appointmentResults.length === 0) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      const appointment = appointmentResults[0];

      // Update appointment status
      const updateQuery = `
        UPDATE appointments 
        SET status = 'confirmed', approved_by = ?, approved_at = NOW()
        WHERE id = ?
      `;
      
      await db.promise().query(updateQuery, [adminId, id]);

      // Send approval SMS
      try {
        if (appointment.user_phone && !appointment.approval_sms_sent) {
          const userForSMS = {
            full_name: appointment.user_name || appointment.full_name,
            phone: appointment.user_phone || appointment.phone
          };

          await smsService.sendAppointmentApproval(appointment, userForSMS);
          
          // Mark SMS as sent
          await db.promise().query(
            'UPDATE appointments SET approval_sms_sent = TRUE WHERE id = ?',
            [id]
          );
        }
      } catch (smsError) {
        console.error('Error sending approval SMS:', smsError);
      }

      res.json({ message: 'Cita aprobada exitosamente' });
    } catch (error) {
      console.error('Error approving appointment:', error);
      res.status(500).json({ error: 'Error al aprobar la cita' });
    }
  },

  // Verify a user (admin only)
  verifyUser: async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user.id;

      // Get user details
      const userQuery = 'SELECT * FROM users WHERE id = ?';
      const [userResults] = await db.promise().query(userQuery, [id]);
      
      if (userResults.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const user = userResults[0];

      // Update user verification status
      const updateQuery = `
        UPDATE users 
        SET is_verified = TRUE, verified_by = ?, verified_at = NOW(), requires_verification = FALSE
        WHERE id = ?
      `;
      
      await db.promise().query(updateQuery, [adminId, id]);

      // Auto-approve any pending appointments from this user
      const approveAppointmentsQuery = `
        UPDATE appointments 
        SET status = 'confirmed', approved_by = ?, approved_at = NOW()
        WHERE user_id = ? AND status = 'pending' AND requires_approval = TRUE
      `;
      
      await db.promise().query(approveAppointmentsQuery, [adminId, id]);

      // Send verification SMS
      try {
        await smsService.sendUserVerification(user);

        // Send approval SMS for any pending appointments
        const pendingAppointmentsQuery = `
          SELECT * FROM appointments 
          WHERE user_id = ? AND approved_by = ? AND approval_sms_sent = FALSE
        `;
        
        const [pendingAppointments] = await db.promise().query(pendingAppointmentsQuery, [id, adminId]);
        
        for (const appointment of pendingAppointments) {
          await smsService.sendAppointmentApproval(appointment, user);
          await db.promise().query(
            'UPDATE appointments SET approval_sms_sent = TRUE WHERE id = ?',
            [appointment.id]
          );
        }

      } catch (smsError) {
        console.error('Error sending verification SMS:', smsError);
      }

      res.json({ message: 'Usuario verificado exitosamente' });
    } catch (error) {
      console.error('Error verifying user:', error);
      res.status(500).json({ error: 'Error al verificar usuario' });
    }
  },

  // Send appointment reminders
  sendAppointmentReminders: async (req, res) => {
    try {
      // Get appointments for tomorrow that haven't had reminders sent
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];

      const appointmentsQuery = `
        SELECT a.*, u.full_name as user_name, u.phone as user_phone
        FROM appointments a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.date = ? AND a.status = 'confirmed' AND a.reminder_sent = FALSE
      `;

      const [appointments] = await db.promise().query(appointmentsQuery, [tomorrowDate]);

      let sentCount = 0;
      for (const appointment of appointments) {
        try {
          const userForSMS = {
            full_name: appointment.user_name || appointment.full_name,
            phone: appointment.user_phone || appointment.phone
          };

          if (userForSMS.phone) {
            await smsService.sendAppointmentReminder(appointment, userForSMS);
            
            // Mark reminder as sent
            await db.promise().query(
              'UPDATE appointments SET reminder_sent = TRUE, reminder_sent_at = NOW() WHERE id = ?',
              [appointment.id]
            );
            
            sentCount++;
          }
        } catch (smsError) {
          console.error(`Error sending reminder for appointment ${appointment.id}:`, smsError);
        }
      }

      res.json({ 
        message: `${sentCount} recordatorios enviados`,
        total_appointments: appointments.length,
        reminders_sent: sentCount
      });

    } catch (error) {
      console.error('Error sending appointment reminders:', error);
      res.status(500).json({ error: 'Error al enviar recordatorios' });
    }
  },

  // Get pending appointments for admin
  getPendingAppointments: async (req, res) => {
    try {
      const query = `
        SELECT a.*, u.full_name as user_name, u.is_verified, u.phone as user_phone
        FROM appointments a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.status = 'pending' AND a.requires_approval = TRUE
        ORDER BY a.created_at DESC
      `;

      const [results] = await db.promise().query(query);
      res.json(results);
    } catch (error) {
      console.error('Error getting pending appointments:', error);
      res.status(500).json({ error: 'Error al obtener citas pendientes' });
    }
  },

  // Get unverified users for admin
  getUnverifiedUsers: async (req, res) => {
    try {
      const query = `
        SELECT u.id, u.full_name as name, u.email, u.phone, u.created_at, u.auth_provider as provider, u.role,
               COUNT(a.id) as pending_appointments
        FROM users u
        LEFT JOIN appointments a ON u.id = a.user_id AND a.status = 'pending'
        WHERE u.is_verified = FALSE AND u.requires_verification = TRUE AND u.role = 'user'
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `;

      const [results] = await db.promise().query(query);
      res.json(results);
    } catch (error) {
      console.error('Error getting unverified users:', error);
      res.status(500).json({ error: 'Error al obtener usuarios no verificados' });
    }
  }
};

module.exports = appointmentController;
