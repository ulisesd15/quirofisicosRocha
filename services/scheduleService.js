'use strict';

const { BusinessHour, ScheduleException, Announcement, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * ScheduleService
 * Handles schedule, business hours, and announcement logic
 */
class ScheduleService {
  /**
   * Get all business hours
   * @returns {Array} Business hours
   */
  async getBusinessHours() {
    return await BusinessHour.findAll({
      order: [
        [sequelize.literal("FIELD(dayOfWeek, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')")]
      ]
    });
  }

  /**
   * Update business hours for a specific day
   * @param {number} id - Business hour ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated business hour
   */
  async updateBusinessHour(id, updates) {
    const businessHour = await BusinessHour.findByPk(id);

    if (!businessHour) {
      throw new Error('Business hour not found');
    }

    await businessHour.update(updates);

    return businessHour;
  }

  /**
   * Get schedule exceptions with filtering
   * @param {Object} options - Query options
   * @returns {Object} Paginated exceptions
   */
  async getScheduleExceptions({
    page = 1,
    limit = 20,
    startDate,
    endDate,
    active = null
  }) {
    const offset = (page - 1) * limit;
    const where = {};

    // Filter by date range
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    // Filter by active status
    if (active !== null) {
      where.isActive = active;
    }

    const { count, rows } = await ScheduleException.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date', 'ASC']]
    });

    return {
      exceptions: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Create schedule exception
   * @param {Object} data - Exception data
   * @returns {Object} Created exception
   */
  async createScheduleException(data) {
    return await ScheduleException.create(data);
  }

  /**
   * Update schedule exception
   * @param {number} id - Exception ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated exception
   */
  async updateScheduleException(id, updates) {
    const exception = await ScheduleException.findByPk(id);

    if (!exception) {
      throw new Error('Schedule exception not found');
    }

    await exception.update(updates);

    return exception;
  }

  /**
   * Delete schedule exception
   * @param {number} id - Exception ID
   * @returns {boolean} Success
   */
  async deleteScheduleException(id) {
    const exception = await ScheduleException.findByPk(id);

    if (!exception) {
      throw new Error('Schedule exception not found');
    }

    await exception.destroy();
    return true;
  }

  /**
   * Get announcements
   * @param {boolean} activeOnly - Get only active announcements
   * @returns {Array} Announcements
   */
  async getAnnouncements(activeOnly = false) {
    const where = {};

    if (activeOnly) {
      where.isActive = true;
    }

    return await Announcement.findAll({
      where,
      order: [['priority', 'DESC'], ['createdAt', 'DESC']]
    });
  }

  /**
   * Create announcement
   * @param {Object} data - Announcement data
   * @returns {Object} Created announcement
   */
  async createAnnouncement(data) {
    return await Announcement.create(data);
  }

  /**
   * Update announcement
   * @param {number} id - Announcement ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated announcement
   */
  async updateAnnouncement(id, updates) {
    const announcement = await Announcement.findByPk(id);

    if (!announcement) {
      throw new Error('Announcement not found');
    }

    await announcement.update(updates);

    return announcement;
  }

  /**
   * Delete announcement
   * @param {number} id - Announcement ID
   * @returns {boolean} Success
   */
  async deleteAnnouncement(id) {
    const announcement = await Announcement.findByPk(id);

    if (!announcement) {
      throw new Error('Announcement not found');
    }

    await announcement.destroy();
    return true;
  }

  /**
   * Check if a date/time is available based on business hours and exceptions
   * @param {string} date - Date to check
   * @param {string} time - Time to check
   * @returns {Object} Availability info
   */
  async checkAvailability(date, time) {
    // Get day of week
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Check business hours
    const businessHour = await BusinessHour.findOne({
      where: { dayOfWeek }
    });

    if (!businessHour || !businessHour.isOpen) {
      return {
        available: false,
        reason: 'Closed on this day'
      };
    }

    // Check if time is within business hours
    if (time < businessHour.openTime || time > businessHour.closeTime) {
      return {
        available: false,
        reason: `Business hours: ${businessHour.openTime} - ${businessHour.closeTime}`
      };
    }

    // Check schedule exceptions
    const exception = await ScheduleException.findOne({
      where: {
        date,
        isActive: true
      }
    });

    if (exception) {
      return {
        available: false,
        reason: exception.reason || 'Closed for special event'
      };
    }

    return {
      available: true
    };
  }
}

module.exports = new ScheduleService();
