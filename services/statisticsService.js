'use strict';

const { User, Appointment, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * StatisticsService
 * Generates dashboard statistics and reports
 */
class StatisticsService {
  /**
   * Get dashboard statistics
   * @returns {Object} Dashboard stats
   */
  async getDashboardStats() {
    const today = new Date().toISOString().split('T')[0];

    // Run all queries in parallel for performance
    const [
      totalUsers,
      totalAppointments,
      todayAppointments,
      upcomingAppointments,
      appointmentsByStatus,
      usersByRole,
      recentAppointments
    ] = await Promise.all([
      // Total users
      User.count(),

      // Total appointments
      Appointment.count(),

      // Today's appointments
      Appointment.count({
        where: { date: today }
      }),

      // Upcoming appointments
      Appointment.count({
        where: {
          date: { [Op.gte]: today },
          status: { [Op.in]: ['pending', 'confirmed'] }
        }
      }),

      // Appointments by status
      Appointment.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      }),

      // Users by role
      User.findAll({
        attributes: [
          'role',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['role'],
        raw: true
      }),

      // Recent appointments - ✅ FIXED: Don't use scope, include directly
      Appointment.findAll({
        where: {
          status: { [Op.in]: ['pending', 'confirmed'] },
          date: { [Op.gte]: today }
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'email', 'phone', 'isVerified']
        }],
        order: [['date', 'ASC'], ['time', 'ASC']],
        limit: 5
      })
    ]);

    // Format appointment status counts
    const appointmentStatusCounts = appointmentsByStatus.reduce((acc, { status, count }) => {
      acc[status] = parseInt(count);
      return acc;
    }, {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      no_show: 0,
      completed: 0
    });

    // Format user role counts
    const userRoleCounts = usersByRole.reduce((acc, { role, count }) => {
      acc[role] = parseInt(count);
      return acc;
    }, {
      user: 0,
      admin: 0
    });

    return {
      users: {
        total: totalUsers,
        byRole: userRoleCounts
      },
      appointments: {
        total: totalAppointments,
        today: todayAppointments,
        upcoming: upcomingAppointments,
        byStatus: appointmentStatusCounts
      },
      recentAppointments: recentAppointments.map(apt => apt.toJSON())
    };
  }

  /**
   * Get appointment trends
   * @param {number} days - Number of days to analyze
   * @returns {Object} Trend data
   */
  async getAppointmentTrends(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const appointments = await Appointment.findAll({
      where: {
        date: { [Op.gte]: startDateStr }
      },
      attributes: [
        'date',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['date', 'status'],
      order: [['date', 'ASC']],
      raw: true
    });

    return appointments;
  }

  /**
   * Get user growth statistics
   * @param {number} days - Number of days to analyze
   * @returns {Object} Growth data
   */
  async getUserGrowth(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await User.findAll({
      where: {
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    return users;
  }

  /**
   * Get busiest hours
   * @param {number} days - Number of days to analyze
   * @returns {Array} Busiest hours
   */
  async getBusiestHours(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const hours = await Appointment.findAll({
      where: {
        date: { [Op.gte]: startDateStr },
        status: { [Op.in]: ['confirmed', 'completed'] }
      },
      attributes: [
        [sequelize.fn('HOUR', sequelize.col('time')), 'hour'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('HOUR', sequelize.col('time'))],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true
    });

    return hours;
  }
}

module.exports = new StatisticsService();
