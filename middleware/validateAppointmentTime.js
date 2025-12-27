/**
 * validateAppointmentTime.js
 * Middleware to prevent booking appointments in the past
 */

module.exports = function validateAppointmentTime(req, res, next) {
  const { date, time } = req.body;
  
  if (!date || !time) {
    return next(); // Let other validation handle missing fields
  }

  // Construct appointment datetime
  const appointmentDateTime = new Date(`${date}T${time}`);
  const now = new Date();
  
  // Check if appointment is at least 30 minutes in the future
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
  
  if (appointmentDateTime < thirtyMinutesFromNow) {
    return res.status(400).json({ 
      error: 'Invalid appointment time',
      message: 'No se pueden agendar citas en horarios pasados. La cita debe ser al menos 30 minutos en el futuro.'
    });
  }
  
  // Check 90-day advance booking limit
  const maxBookingDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  if (appointmentDateTime > maxBookingDate) {
    return res.status(400).json({
      error: 'Booking too far in advance',
      message: 'No se puede agendar con más de 90 días de antelación.'
    });
  }
  
  next();
};
