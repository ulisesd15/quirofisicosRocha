'use strict';

const { User, Appointment, sequelize } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

/**
 * UserService
 * Handles all user-related business logic
 */
class UserService {
  /**
   * Get users with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Object} Paginated users
   */
  async getUsers({
    page = 1,
    limit = 20,
    role,
    search,
    isVerified,
    authProvider,
    includeAppointments = false,
    sortBy = 'createdAt',
    sortOrder = 'DESC'
  }) {
    const offset = (page - 1) * limit;
    const where = {};

    // Filter by role
    if (role) {
      where.role = role;
    }

    // Filter by verification status
    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    // Filter by auth provider
    if (authProvider) {
      where.authProvider = authProvider;
    }

    // Search by name or email
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // Build include clause
    const include = includeAppointments ? [
      {
        model: Appointment,
        as: 'appointments',
        attributes: ['id', 'date', 'time', 'status']
      }
    ] : [];

    // Execute query
    const { count, rows } = await User.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      distinct: true
    });

    return {
      users: rows,
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
   * Get user by ID
   * @param {number} id - User ID
   * @param {boolean} includeAppointments - Include appointments
   * @returns {Object} User
   */
  async getById(id, includeAppointments = false) {
    const include = includeAppointments ? [
      {
        model: Appointment,
        as: 'appointments',
        order: [['date', 'DESC'], ['time', 'DESC']]
      }
    ] : [];

    const user = await User.findByPk(id, { include });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Object} User
   */
  async getByEmail(email) {
    const user = await User.scope('withPassword').findOne({
      where: { email: email.toLowerCase() }
    });

    return user;
  }

  /**
   * Create new user
   * @param {Object} data - User data
   * @returns {Object} Created user
   */
  async createUser(data) {
    // Check if email already exists
    const existing = await User.findOne({
      where: { email: data.email.toLowerCase() }
    });

    if (existing) {
      throw new Error('Email already registered');
    }

    // Create user (password will be auto-hashed by hook)
    const user = await User.create(data);

    return user;
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Object} Updated user
   */
  async updateUser(id, updates) {
    const transaction = await sequelize.transaction();

    try {
      const user = await User.findByPk(id, { transaction });

      if (!user) {
        throw new Error('User not found');
      }

      // Check email uniqueness if email is being updated
      if (updates.email && updates.email !== user.email) {
        const existing = await User.findOne({
          where: {
            email: updates.email.toLowerCase(),
            id: { [Op.ne]: id }
          },
          transaction
        });

        if (existing) {
          throw new Error('Email already in use');
        }
      }

      // Update user (password will be auto-hashed if changed)
      await user.update(updates, { transaction });

      await transaction.commit();

      return user;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {boolean} Success
   */
  async deleteUser(id) {
    const user = await User.findByPk(id);

    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }

    await user.destroy();
    return true;
  }

  /**
   * Change user password
   * @param {number} id - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {boolean} Success
   */
  async changePassword(id, currentPassword, newPassword) {
    const user = await User.scope('withPassword').findByPk(id);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await user.checkPassword(currentPassword);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Update password (will be auto-hashed by hook)
    await user.update({ password: newPassword });

    return true;
  }

  /**
   * Verify user email
   * @param {number} id - User ID
   * @returns {Object} Updated user
   */
  async verifyUser(id) {
    const user = await User.findByPk(id);

    if (!user) {
      throw new Error('User not found');
    }

    await user.update({ isVerified: true });

    return user;
  }

  /**
   * Get user statistics
   * @returns {Object} Statistics
   */
  async getStatistics() {
    // Total users
    const totalUsers = await User.count();

    // Count by role
    const roleCounts = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role'],
      raw: true
    });

    // Count verified/unverified
    const verifiedCount = await User.count({ where: { isVerified: true } });
    const unverifiedCount = await User.count({ where: { isVerified: false } });

    // Count by auth provider
    const providerCounts = await User.findAll({
      attributes: [
        'authProvider',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['authProvider'],
      raw: true
    });

    // Format counts
    const byRole = roleCounts.reduce((acc, { role, count }) => {
      acc[role] = parseInt(count);
      return acc;
    }, { user: 0, admin: 0 });

    const byProvider = providerCounts.reduce((acc, { authProvider, count }) => {
      acc[authProvider] = parseInt(count);
      return acc;
    }, { local: 0, google: 0 });

    return {
      total: totalUsers,
      verified: verifiedCount,
      unverified: unverifiedCount,
      byRole,
      byProvider
    };
  }

  /**
   * Get users with upcoming appointments
   * @param {number} limit - Max results
   * @returns {Array} Users
   */
  async getUsersWithUpcomingAppointments(limit = 10) {
    const today = new Date().toISOString().split('T')[0];

    return await User.findAll({
      include: [
        {
          model: Appointment,
          as: 'appointments',
          where: {
            date: { [Op.gte]: today },
            status: { [Op.in]: ['pending', 'confirmed'] }
          },
          required: true
        }
      ],
      limit
    });
  }

  /**
   * Bulk update user verification status
   * @param {Array} ids - User IDs
   * @param {boolean} isVerified - Verification status
   * @returns {number} Number of updated records
   */
  async bulkUpdateVerification(ids, isVerified) {
    const [updatedCount] = await User.update(
      { isVerified },
      {
        where: {
          id: { [Op.in]: ids }
        }
      }
    );

    return updatedCount;
  }

  /**
   * Bulk delete users
   * @param {Array} ids - User IDs
   * @returns {number} Number of deleted records
   */
  async bulkDelete(ids) {
    // Don't allow deleting all admins
    const adminCount = await User.count({
      where: {
        role: 'admin',
        id: { [Op.notIn]: ids }
      }
    });

    if (adminCount === 0) {
      throw new Error('Cannot delete all admin users');
    }

    const deletedCount = await User.destroy({
      where: {
        id: { [Op.in]: ids }
      }
    });

    return deletedCount;
  }
}

module.exports = new UserService();
