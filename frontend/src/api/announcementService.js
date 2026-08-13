/**
 * announcementService.js — public announcements banner feed.
 */
import { api } from './client';

export const announcementService = {
  getActive: () => api.get('/api/announcements/active', { auth: false }),
};
