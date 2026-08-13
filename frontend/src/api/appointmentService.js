/**
 * appointmentService.js — booking, listing, rescheduling, and cancelling appointments.
 * Mirrors the endpoints consumed by the old appointment.html / mis-citas.html / reschedule.html pages.
 */
import { api } from './client';

export const appointmentService = {
  create: (data) => api.post('/api/appointments', data, { auth: false }),

  getMyAppointments: () => api.get('/api/appointments/my-appointments'),

  getById: (id) => api.get(`/api/appointments/${id}`),

  update: (id, data) => api.put(`/api/appointments/${id}`, data),

  cancel: (id) => api.put(`/api/appointments/${id}/cancel`),

  reschedule: (id, data) => api.post(`/api/appointments/${id}/reschedule`, data),

  remove: (id) => api.delete(`/api/appointments/${id}`),

  getByDate: (date) => api.get(`/api/appointments/date/${date}`, { auth: false }),
};
