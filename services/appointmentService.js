'use strict';

const { Appointment, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * AppointmentService
 * Handles all appointment-related business logic
 */
class AppointmentService {
  /**
   * Get appointments with advanced filtering and pagination
   * @param {Object} options - Query options
   * @returns {Object} Paginated appointments
   */
  async getAppointments({
    page = 1,
    limit = 20,
    status,
    date,
    search,
    userId,
    startDate,
    endDate,
    includeUser = true,
    sortBy = 'date',
    sortOrder = 'DESC'
  }) {
    const offset = (page - 1) * limit;
    const where = {};

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by specific date
    if (date) {
      where.date = date;
    }

    // Filter by user
    if (userId) {
      where.userId = userId;
    }

    // Filter by date range
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    // Search across multiple fields
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    // Build include clause
    const include = includeUser ? [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'phone', 'isVerified']
      }
    ] : [];

    // Execute query
    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder], ['time', sortOrder]],
      distinct: true
    });

    return {
      appointments: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
        hasMore: page * limit < count
      }
    };
  }

  /**
   * Get appointment by ID
   * @param {number} id - Appointment ID
   * @returns {Object} Appointment
   */
  async getById(id) {
    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email', 'phone', 'isVerified']
        }
      ]
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    return appointment;
  }

  /**
   * Create new appointment with validation
   * @param {Object} data - Appointment data
   * @returns {Object} Created appointment
   */
  async createAppointment(data) {
    const transaction = await sequelize.transaction();

    try {
      // Check if time slot is available (max 2 appointments per slot)
      const existingCount = await Appointment.count({
        where: {
          date: data.date,
          time: data.time,
          status: { [Op.in]: ['pending', 'confirmed'] }
        },
        transaction
      });

      if (existingCount >= 2) {
        throw new Error('Este horario ya está completamente reservado');
      }

      // Create appointment
      const appointment = await Appointment.create(data, { transaction });

      await transaction.commit();

      // Fetch with user data
      return await this.getById(appointment.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update appointment with validation
   * @param {number} id - Appointment ID
   * @param {Object} updates - Fields to update
   * @param {number} adminId - ID of admin making the change
   * @returns {Object} Updated appointment
   */
  async updateAppointment(id, updates, adminId = null) {
    const transaction = await sequelize.transaction();

    try {
      const appointment = await Appointment.findByPk(id, { transaction });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Validate slot availability if date/time changed
      if (updates.date || updates.time) {
        const newDate = updates.date || appointment.date;
        const newTime = updates.time || appointment.time;

        const existingCount = await Appointment.count({
          where: {
            date: newDate,
            time: newTime,
            status: { [Op.in]: ['pending', 'confirmed'] },
            id: { [Op.ne]: id }
          },
          transaction
        });

        if (existingCount >= 2) {
          throw new Error('Este horario ya está completamente reservado');
        }
      }

      // Update appointment
      await appointment.update(updates, { transaction });

      await transaction.commit();

      // Return updated appointment with user data
      return await this.getById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete appointment
   * @param {number} id - Appointment ID
   * @returns {boolean} Success
   */
  async deleteAppointment(id) {
    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    await appointment.destroy();
    return true;
  }

  /**
   * Update appointment status
   * @param {number} id - Appointment ID
   * @param {string} status - New status
   * @returns {Object} Updated appointment
   */
  async updateStatus(id, status) {
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'no_show', 'completed'];

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return await this.updateAppointment(id, { status });
  }

  /**
   * Get appointment statistics
   * @param {string} startDate - Start date (optional)
   * @param {string} endDate - End date (optional)
   * @returns {Object} Statistics
   */
  async getStatistics(startDate = null, endDate = null) {
    const where = {};

    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    // Get counts by status
    const statusCounts = await Appointment.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Get today's appointments count
    const today = new Date().toISOString().split('T')[0];
    const todayCount = await Appointment.count({
      where: { date: today }
    });

    // Get upcoming appointments count
    const upcomingCount = await Appointment.count({
      where: {
        date: { [Op.gte]: today },
        status: { [Op.in]: ['pending', 'confirmed'] }
      }
    });

    // Get total appointments
    const totalCount = await Appointment.count({ where });

    // Format status counts
    const byStatus = statusCounts.reduce((acc, { status, count }) => {
      acc[status] = parseInt(count);
      return acc;
    }, {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      no_show: 0,
      completed: 0
    });

    return {
      total: totalCount,
      today: todayCount,
      upcoming: upcomingCount,
      byStatus
    };
  }

  /**
   * Get upcoming appointments
   * @param {number} limit - Max results
   * @returns {Array} Appointments
   */
  async getUpcoming(limit = 10) {
    return await Appointment.scope(['upcoming', 'withUser']).findAll({
      limit
    });
  }

  /**
   * Get today's appointments
   * @returns {Array} Appointments
   */
  async getToday() {
    return await Appointment.scope(['today', 'withUser']).findAll();
  }

  /**
   * Bulk update appointment statuses
   * @param {Array} ids - Appointment IDs
   * @param {string} status - New status
   * @returns {number} Number of updated records
   */
  async bulkUpdateStatus(ids, status) {
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'no_show', 'completed'];

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const [updatedCount] = await Appointment.update(
      { status },
      {
        where: {
          id: { [Op.in]: ids }
        }
      }
    );

    return updatedCount;
  }

  /**
   * Bulk delete appointments
   * @param {Array} ids - Appointment IDs
   * @returns {number} Number of deleted records
   */
  async bulkDelete(ids) {
    const deletedCount = await Appointment.destroy({
      where: {
        id: { [Op.in]: ids }
      }
    });

    return deletedCount;
  }

  /**
   * Check if time slot is available
   * @param {string} date - Date
   * @param {string} time - Time
   * @param {number} excludeId - Appointment ID to exclude (for updates)
   * @returns {Object} Availability info
   */
  async checkSlotAvailability(date, time, excludeId = null) {
    const where = {
      date,
      time,
      status: { [Op.in]: ['pending', 'confirmed'] }
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    const count = await Appointment.count({ where });
    const maxSlots = 2;

    return {
      available: count < maxSlots,
      bookedSlots: count,
      availableSlots: maxSlots - count,
      maxSlots
    };
  }
}

module.exports = new AppointmentService();
