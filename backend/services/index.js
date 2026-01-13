'use strict';

/**
 * Service Layer Index
 * Exports all services for easy importing
 */

const AppointmentService = require('./appointmentService');
const UserService = require('./userService');
const ScheduleService = require('./scheduleService');
const StatisticsService = require('./statisticsService');

module.exports = {
  AppointmentService,
  UserService,
  ScheduleService,
  StatisticsService
};
