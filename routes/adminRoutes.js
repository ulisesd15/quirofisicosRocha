
/**
 * adminRoutes.js
 *
 * Express router for all admin-related endpoints in the medical appointment system.
 * Handles dashboard stats, business hours, schedule exceptions, user management, appointment management,
 * clinic settings, announcements, and notification testing. All routes are protected by requireAdmin middleware.
 *
 * Key Features:
 * - Dashboard statistics for admin panel
 * - CRUD for business hours and scheduled business hours
 * - Schedule exceptions (e.g., holidays, special hours)
 * - User management (CRUD, verification)
 * - Appointment management (CRUD, approval/rejection)
 * - Clinic settings management
 * - Announcements (CRUD, public display)
 * - Notification testing endpoints (email/SMS)
 */

const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const authenticateToken = require('../middleware/authenticateToken');
const router = express.Router();

const { User, Appointment, BusinessHour, ScheduleException, Announcement, sequelize } = require('../models');
const { Op } = require('sequelize');

// Apply authentication middleware to all admin routes before checking for admin role
router.use(authenticateToken);


/**
 * GET /dashboard/stats
 * Returns statistics for the admin dashboard: user count, appointment counts, and recent appointments.
 */
router.get('/dashboard/stats', requireAdmin, async (req, res) => {
  try {
    // User count
    let totalUsers = 0, totalAppointments = 0, todayAppointments = 0, pendingAppointments = 0, recentAppointments = [];
    try {
      totalUsers = await User.count();
    } catch (err) {
      console.error('Error fetching user count:', err);
    }
    try {
      totalAppointments = await Appointment.count();
    } catch (err) {
      console.error('Error fetching appointment count:', err);
    }
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      todayAppointments = await Appointment.count({ where: { date: todayStr } });
    } catch (err) {
      console.error('Error fetching today appointments:', err);
    }
    try {
      pendingAppointments = await Appointment.count({ where: { status: 'pending' } });
    } catch (err) {
      console.error('Error fetching pending appointments:', err);
    }
    try {
      recentAppointments = await Appointment.findAll({
        attributes: ['id', 'fullName', 'email', 'date', 'time', 'status'],
        order: [['date', 'DESC'], ['time', 'DESC']],
        limit: 5
      });
    } catch (err) {
      console.error('Error fetching recent appointments:', err);
    }
    res.json({
      totalUsers,
      totalAppointments,
      todayAppointments,
      pendingAppointments,
      recentAppointments
    });
  } catch (error) {
    console.error('Error in dashboard stats endpoint:', error);
    res.status(500).json({ error: 'Error fetching dashboard stats' });
  }
});

// =================
// SCHEDULED BUSINESS HOURS MANAGEMENT
// =================

// Get business hours


// Update business hours

/**
 * PUT /business-hours/:id
 * Updates a single business hour entry by ID.
 */
router.put('/business-hours/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { isOpen, openTime, closeTime, breakStart, breakEnd } = req.body;
  try {
    const [updated] = await BusinessHour.update(
      { isOpen, openTime, closeTime, breakStart, breakEnd },
      { where: { id } }
    );
    if (updated === 0) return res.status(404).json({ error: 'Business hour not found' });
    res.json({ message: 'Business hours updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});



/**
 * PUT /business-hours
 * Bulk update or insert business hours for all days of the week.
 */
router.put('/business-hours', requireAdmin, async (req, res) => {
  const { businessHours } = req.body;
  if (!businessHours || !Array.isArray(businessHours)) {
    return res.status(400).json({ error: 'Invalid business hours data' });
  }
  
  try {
    const updatePromises = businessHours.map(async (hours) => {
      const existing = await BusinessHour.findOne({
        where: { dayOfWeek: hours.dayOfWeek }
      });

      const data = {
        dayOfWeek: hours.dayOfWeek,
        isOpen: hours.isOpen,
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        breakStart: hours.breakStart || null,
        breakEnd: hours.breakEnd || null
      };

      if (existing) return existing.update(data);
      return BusinessHour.create(data);
    });

    await Promise.all(updatePromises);
    res.json({ message: 'Business hours updated successfully' });
  } catch (err) {
    console.error('Error updating business hours:', err);
    res.status(500).json({ error: 'Database error updating business hours' });
  }
});



/**
 * GET /scheduled-business-hours
 * Returns all scheduled business hours, ordered by effective date and day of week.
 */
router.get('/scheduled-business-hours', requireAdmin, async (req, res) => {
  try {
    const results = await BusinessHour.findAll({ order: [['effectiveDate', 'DESC'], ['dayOfWeek', 'ASC']] });
    res.json({ scheduledBusinessHours: results });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// Get single scheduled business hour by ID

/**
 * GET /scheduled-business-hours/:id
 * Returns a single scheduled business hour entry by ID.
 */
router.get('/scheduled-business-hours/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await BusinessHour.findByPk(id);
    if (!result) return res.status(404).json({ error: 'Scheduled business hour not found' });
    res.json({ scheduledBusinessHour: result });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// Create new scheduled business hours

/**
 * POST /scheduled-business-hours
 * Creates a new set of scheduled business hours for a given effective date.
 */
router.post('/scheduled-business-hours', requireAdmin, async (req, res) => {
  const { businessHours, effectiveDate } = req.body;
  if (!businessHours || !Array.isArray(businessHours) || !effectiveDate) {
    return res.status(400).json({ message: 'Missing businessHours array or effectiveDate' });
  }

  try {
    await sequelize.transaction(async (t) => {
      // 3. Delete all existing scheduled hours
      await BusinessHour.destroy({ where: { effectiveDate }, transaction: t }); 

      // 4. Insert the new schedule
      const records = businessHours.map(bh => ({
        dayOfWeek: bh.dayOfWeek,
        isOpen: bh.isOpen,
        openTime: bh.openTime || null,
        closeTime: bh.closeTime || null,
        breakStart: bh.breakStart || null,
        breakEnd: bh.breakEnd || null,
        effectiveDate
      }));

      await BusinessHour.bulkCreate(records, { transaction: t });
    });

    res.json({ message: 'Horario futuro guardado exitosamente.' });
  } catch (error) {
    console.error('Error saving scheduled business hours:', error);
    res.status(500).json({ message: 'Error al guardar horarios' });
  }
});


// Get schedule exceptions

/**
 * GET /schedule-exceptions
 * Returns all active schedule exceptions (e.g., holidays, special hours).
 */
router.get('/schedule-exceptions', requireAdmin, async (req, res) => {
  try {
    const results = await ScheduleException.findAll({
      where: { isActive: true },
      order: [['startDate', 'DESC']]
    });
    res.json({ scheduleExceptions: results });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// Add schedule exception

/**
 * POST /schedule-exceptions
 * Adds a new schedule exception (e.g., holiday, special hours).
 */
router.post('/schedule-exceptions', requireAdmin, async (req, res) => {
  const {
    type,
    startDate,
    endDate,
    isClosed,
    customOpenTime,
    customCloseTime,
    customBreakStart,
    customBreakEnd,
    reason,
    description,
    recurringType
  } = req.body;

  try {
    const result = await ScheduleException.create({
      type: type || (isClosed ? 'CLOSURE' : 'OVERRIDE_HOURS'),
      startDate,
      endDate: endDate || null,
      customOpenTime: customOpenTime || null,
      customCloseTime: customCloseTime || null,
      customBreakStart: customBreakStart || null,
      customBreakEnd: customBreakEnd || null,
      reason: reason || '',
      description: description || '',
      isRecurring: recurringType === 'yearly',
      recurringType: recurringType || null,
      isActive: true
    });
    res.json({ message: 'Schedule exception added successfully', id: result.id });
  } catch (err) {
    console.error('Error adding schedule exception:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update schedule exception

/**
 * PUT /schedule-exceptions/:id
 * Updates an existing schedule exception by ID.
 */
router.put('/schedule-exceptions/:id', requireAdmin, async (req, res) => {
  const exceptionId = req.params.id;
  const {
    type,
    startDate,
    endDate,
    isClosed,
    customOpenTime,
    customCloseTime,
    customBreakStart,
    customBreakEnd,
    reason,
    description,
    recurringType,
    isActive
  } = req.body;

  try {
    const [updated] = await ScheduleException.update({
      type,
      startDate,
      endDate,
      customOpenTime,
      customCloseTime,
      customBreakStart,
      customBreakEnd,
      reason,
      description,
      isRecurring: recurringType === 'yearly',
      recurringType,
      isActive
    }, { where: { id: exceptionId } });

    if (updated === 0) return res.status(404).json({ error: 'Schedule exception not found' });
    res.json({ message: 'Schedule exception updated successfully' });
  } catch (err) {
    console.error('Error updating schedule exception:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete schedule exception

/**
 * DELETE /schedule-exceptions/:id
 * Soft-deletes a schedule exception by setting is_active to false.
 */
router.delete('/schedule-exceptions/:id', requireAdmin, async (req, res) => {
  const exceptionId = req.params.id;
  try {
    const [updated] = await ScheduleException.update({ isActive: false }, { where: { id: exceptionId } });
    if (updated === 0) return res.status(404).json({ error: 'Schedule exception not found' });
    res.json({ message: 'Schedule exception deleted successfully' });
  } catch (err) {
    console.error('Error deleting schedule exception:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// =================
// USER MANAGEMENT
// =================

// Get all users (paginated)

/**
 * GET /users
 * Returns a paginated list of users, with optional search and role filtering.
 */
router.get('/users', requireAdmin, async (req, res) => {
  console.log('DEBUG: /api/admin/users route hit');
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const roleFilter = req.query.role || '';
  
  const where = {};
  if (roleFilter) where.role = roleFilter;
  if (search) {
    where[Op.or] = [
      { fullName: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%%` } }
    ];
  }

  try {
    const { count, rows } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: ['id', ['fullName', 'name'], 'email', 'phone', ['authProvider', 'provider'], 'role', 'createdAt']
    });

    res.json({
      users: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalRecords: count,
        limit: limit
      }
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single user

/**
 * GET /users/:id
 * Returns a single user by ID.
 */
router.get('/users/:id', requireAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'fullName', 'email', 'phone', ['authProvider', 'provider'], 'role', 'createdAt']
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update user

/**
 * PUT /users/:id
 * Updates a user's information by ID.
 */
router.put('/users/:id', requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const { name, fullName, email, phone, role, provider } = req.body;
  
  // Accept both 'name' and 'fullName' for backward compatibility
  const userName = fullName || name;
  
  try {
    const [updated] = await User.update(
      { fullName: userName, email, phone, role, authProvider: provider },
      { where: { id: userId } }
    );
    if (updated === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Database error' });
  }
});


// Update user role

/**
 * PUT /users/:id/role
 * Updates a user's role by ID.
 */
router.put('/users/:id/role', requireAdmin, async (req, res) => {
    const { role } = req.body;
    const userId = req.params.id;

    if (!role || (role !== 'user' && role !== 'admin')) {
        return res.status(400).json({ error: 'Invalid role specified.' });
    }
    try {
      const [updated] = await User.update({ role }, { where: { id: userId } });
      if (updated === 0) return res.status(404).json({ error: 'User not found.' });
      res.json({ message: 'User role updated successfully.' });
    } catch (err) {
      console.error("Error updating user role:", err);
      res.status(500).json({ error: 'Database error while updating role.' });
    }
});

// Delete user

/**
 * DELETE /users/:id
 * Deletes a user by ID (cannot delete admin users).
 */
router.delete('/users/:id', requireAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    const deleted = await User.destroy({ where: { id: userId, role: { [Op.ne]: 'admin' } } });
    if (deleted === 0) return res.status(404).json({ error: 'User not found or cannot delete admin' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// ADMIN: Verify a user

/**
 * PUT /users/:id/verify
 * Verifies a user (sets is_verified to true).
 */
router.put('/users/:id/verify', requireAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    const [updated] = await User.update({ isVerified: true, requiresVerification: false }, { where: { id: userId } });
    if (updated === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario verificado correctamente' });
  } catch (err) { res.status(500).json({ error: 'Error verificando usuario' }); }
});

// =================
// APPOINTMENT MANAGEMENT
// =================

router.get('/appointments', requireAdmin, async (req, res) => {
  console.log('DEBUG: /api/admin/appointments route hit');
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const offset = (page - 1) * limit;
  const status = req.query.status || '';
  const date = req.query.date || '';
  const startDate = req.query.startDate || '';
  const endDate = req.query.endDate || '';
  const search = req.query.search || '';
  
  const where = {};
  if (status) where.status = status;
  if (date) where.date = date;
  if (startDate && endDate) where.date = { [Op.between]: [startDate, endDate] };
  else if (startDate) where.date = { [Op.gte]: startDate };
  else if (endDate) where.date = { [Op.lte]: endDate };

  if (search) {
    where[Op.or] = [
      { fullName: { [Op.like]: `%%` } },
      { email: { [Op.like]: `%%` } },
      { phone: { [Op.like]: `%%` } }
    ];
  }

  try {
    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['fullName', 'email'] }],
      limit,
      offset,
      order: [['date', 'DESC'], ['time', 'DESC']]
    });

    res.json({
      appointments: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalRecords: count,
        limit: limit
      }
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ADMIN: Get all unverified users

/**
 * GET /users/unverified
 * Returns all users who are not yet verified.
 */
router.get('/users/unverified', requireAdmin, async (req, res) => {
  try {
    const results = await User.findAll({
      where: { isVerified: false, role: { [Op.ne]: 'admin' } }
    });
    res.json({ users: results });
  } catch (err) { res.status(500).json({ error: 'Error obteniendo usuarios no verificados' }); }
});

// Get single appointment

/**
 * GET /appointments/:id
 * Returns a single appointment by ID.
 */
router.get('/appointments/:id', requireAdmin, async (req, res) => {
  const appointmentId = req.params.id;
  try {
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [{ model: User, as: 'user', attributes: ['fullName', 'email'] }]
    });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ appointment });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// Update appointment

/**
 * PUT /appointments/:id
 * Updates an appointment's details by ID.
 */
router.put('/appointments/:id', requireAdmin, async (req, res) => {
  const appointmentId = req.params.id;
  const fields = req.body;
  
  try {
    const [updated] = await Appointment.update(fields, { where: { id: appointmentId } });
    if (updated === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ message: 'Appointment updated successfully' });
  } catch (err) {
    console.error("Error updating appointment:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete appointment
router.delete('/appointments/:id', requireAdmin, async (req, res) => {
  const appointmentId = req.params.id;
  try {
    const deleted = await Appointment.destroy({ where: { id: appointmentId } });
    if (deleted === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});


// Get all pending appointments

/**
 * GET /appointments/pending
 * Returns all appointments with status 'pending'.
 */
router.get('/appointments/pending', requireAdmin, async (req, res) => {
  try {
    const results = await Appointment.findAll({
      where: { status: 'pending', userId: { [Op.ne]: null } },
      include: [{
        model: User,
        as: 'user',
        where: { isVerified: false },
        attributes: ['id', 'fullName', 'email', 'phone', 'isVerified']
      }],
      order: [['date', 'ASC'], ['time', 'ASC']]
    });
    res.json(results);
  } catch (err) { res.status(500).json({ error: 'Error obteniendo citas pendientes' }); }
});

/**
 * PUT /appointments/:id/approve
 * Approves an appointment and verifies the associated user.
 * This is a transactional operation.
 */
router.put('/appointments/:id/approve', requireAdmin, async (req, res) => {
  const appointmentId = req.params.id;

  try {
    await sequelize.transaction(async (t) => {
      const appointment = await Appointment.findByPk(appointmentId, { transaction: t });
      if (!appointment) throw new Error('Appointment not found');

      await appointment.update({ status: 'confirmed' }, { transaction: t });

      if (appointment.userId) {
        await User.update({ isVerified: true }, { where: { id: appointment.userId }, transaction: t });
      }
    });
    res.json({ message: 'Cita aprobada y usuario verificado correctamente.' });
  } catch (error) {
    console.error('Error during appointment approval transaction:', error);
    if (error.message === 'Appointment not found') {
      return res.status(404).json({ error: 'Cita no encontrada.' });
    }
    res.status(500).json({ error: 'Error en el servidor al procesar la aprobación.' });
  }
});

// =================
// CLINIC SETTINGS MANAGEMENT
// =================

// Get clinic settings
router.get('/settings', requireAdmin, async (req, res) => {
  // Model removed, returning empty object to prevent crash
  res.json({});
});

// Update multiple clinic settings
router.put('/settings', requireAdmin, async (req, res) => {
  res.json({ message: 'Settings management is currently disabled.' });
});

// Update clinic setting
router.put('/settings/:key', requireAdmin, async (req, res) => {
  res.json({ message: 'Settings management is currently disabled.' });
});

// Server status endpoint for admin dashboard

/**
 * GET /server/status
 * Returns server health and resource usage for the admin dashboard.
 */
router.get('/server/status', requireAdmin, (req, res) => {
  res.json({
    isHealthy: true,
    uptime: process.uptime() + ' seconds',
    cpuUsage: Math.round(Math.random() * 100), // Replace with real CPU usage if needed
    memoryUsage: Math.round(process.memoryUsage().rss / 1024 / 1024) // MB
  });
});

// Get recent approvals for admin dashboard

/**
 * GET /approval/recent
 * Returns recent user registrations for admin approval dashboard.
 */
router.get('/approval/recent', requireAdmin, async (req, res) => {
  // For now, return recent user registrations as a placeholder
  try {
    const results = await User.findAll({
      where: { role: { [Op.ne]: 'admin' } },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'email', 'fullName', 'createdAt', 'role']
    });
    res.json(results);
  } catch (err) {
    console.error('Database error in /approval/recent:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// =================
// ANNOUNCEMENTS MANAGEMENT
// =================

// Get announcements
router.get('/announcements', requireAdmin, async (req, res) => {
  try {
    const results = await Announcement.findAll({
      where: { isActive: true },
      include: [{ model: User, as: 'creator', attributes: ['fullName'] }],
      order: [['priority', 'DESC'], ['createdAt', 'DESC']]
    });
    // Map result to include created_by_name for frontend compatibility if needed
    const mapped = results.map(r => {
      const plain = r.get({ plain: true });
      plain.createdByName = plain.creator ? plain.creator.fullName : null;
      return plain;
    });
    res.json(mapped);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get active announcements for public display
router.get('/announcements/public', async (req, res) => {
  try {
    const results = await Announcement.findAll({
      where: {
        isActive: true,
        showOnHomepage: true,
        startDate: { [Op.lte]: new Date() },
        [Op.or]: [
          { endDate: null },
          { endDate: { [Op.gte]: new Date() } }
        ]
      },
      order: [['priority', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json(results);
  } catch (err) {
    console.error('Error fetching public announcements:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add announcement
router.post('/announcements', requireAdmin, async (req, res) => {
  const {
    title,
    message,
    announcementType,
    priority,
    startDate,
    endDate,
    showOnHomepage,
    showOnBooking
  } = req.body;

  if (!title || !message || !startDate) {
    return res.status(400).json({ error: 'Title, message, and start date are required' });
  }

  try {
    const result = await Announcement.create({
      title,
      message,
      announcementType: announcementType || 'info',
      priority: priority || 'normal',
      startDate,
      endDate: endDate || null,
      showOnHomepage: showOnHomepage !== undefined ? showOnHomepage : true,
      showOnBooking: showOnBooking !== undefined ? showOnBooking : false,
      createdBy: req.user.id,
      isActive: true
    });
    res.json({ message: 'Announcement added successfully', id: result.id });
  } catch (err) {
    console.error('Error adding announcement:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update announcement
router.put('/announcements/:id', requireAdmin, async (req, res) => {
  const announcementId = req.params.id;
  const {
    title,
    message,
    announcementType,
    priority,
    startDate,
    endDate,
    showOnHomepage,
    showOnBooking,
    isActive
  } = req.body;

  try {
    const [updated] = await Announcement.update({
      title,
      message,
      announcementType,
      priority,
      startDate,
      endDate,
      showOnHomepage,
      showOnBooking,
      isActive
    }, { where: { id: announcementId } });

    if (updated === 0) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ message: 'Announcement updated successfully' });
  } catch (err) {
    console.error('Error updating announcement:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete announcement
router.delete('/announcements/:id', requireAdmin, async (req, res) => {
  const announcementId = req.params.id;
  try {
    const [updated] = await Announcement.update({ isActive: false }, { where: { id: announcementId } });
    if (updated === 0) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    console.error('Error deleting announcement:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// =================
// NOTIFICATION TESTING ENDPOINTS
// =================

// Test email notification
router.post('/test-email-notification', requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    const adminEmail = req.user.email;
    
    // Import email service (you might need to adjust this path)
    const smsController = require('../controllers/smsController');
    
    // For now, we'll just log the email test since we don't have email service set up
    console.log('📧 Email test notification:');
    console.log('To:', adminEmail);
    console.log('Message:', message);
    
    // In a real implementation, you would send the email here
    // await emailService.sendTestEmail(adminEmail, message);
    
    res.json({ 
      success: true, 
      message: 'Test email logged successfully (email service not configured)',
      recipient: adminEmail
    });
    
  } catch (error) {
    console.error('Error testing email notification:', error);
    res.status(500).json({ error: 'Error sending test email' });
  }
});

// Test SMS notification
router.post('/test-sms-notification', requireAdmin, async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }
    
    // Import SMS service
    const smsController = require('../controllers/smsController');
    
    // Send test SMS
    const result = await smsController.sendTestSMS(phone, message);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Test SMS sent successfully',
        recipient: phone,
        messageId: result.messageId
      });
    } else {
      res.status(500).json({ error: result.error });
    }
    
  } catch (error) {
    console.error('Error testing SMS notification:', error);
    res.status(500).json({ error: 'Error sending test SMS' });
  }
});

module.exports = router;