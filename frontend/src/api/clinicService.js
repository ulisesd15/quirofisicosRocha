/**
 * clinicService.js — public clinic info: settings, business hours, maps key.
 */
import { api } from './client';

export const clinicService = {
  getSettings: () => api.get('/api/clinic-settings', { auth: false }),

  getBusinessHours: () => api.get('/api/business-hours', { auth: false }),

  getBusinessHoursForDate: (date) => api.get(`/api/business-hours/${date}`, { auth: false }),

  getAvailableSlots: (date) => api.get(`/api/available-slots/${date}`, { auth: false }),

  getScheduleExceptions: () => api.get('/api/schedule-exceptions', { auth: false }),

  getMapsKey: () => api.get('/api/config/maps-key', { auth: false }),
};
