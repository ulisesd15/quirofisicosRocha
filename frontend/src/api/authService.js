/**
 * authService.js — wraps every /api/auth/* endpoint used by the app.
 */
import { api } from './client';

export const authService = {
  login: (email, password) => api.post('/api/auth/login', { email, password }, { auth: false }),

  register: (data) => api.post('/api/auth/register', data, { auth: false }),

  getProfile: () => api.get('/api/auth/profile'),

  updateProfile: (data) => api.put('/api/auth/update-profile', data),

  changePassword: (data) => api.put('/api/auth/change-password', data),

  /** Redirect helper — Google OAuth is a full page navigation, not a fetch call. */
  googleLoginUrl: () => '/api/auth/google',
};
