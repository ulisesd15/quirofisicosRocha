import { apiUrl } from '../../../config.js';

function getAuthToken() {
  return localStorage.getItem('token') || localStorage.getItem('userToken') || '';
}

async function request(path, { method = 'GET', body } = {}) {
  const token = getAuthToken();
  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(apiUrl(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorBody = await response.json();
      message = errorBody.message || errorBody.error || message;
    } catch {
      // Keep the fallback message when the server does not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const announcementService = {
  list: () => request('/admin/announcements'),
  create: (announcement) =>
    request('/admin/announcements', { method: 'POST', body: announcement }),
  update: (id, announcement) =>
    request(`/admin/announcements/${id}`, {
      method: 'PUT',
      body: announcement,
    }),
  remove: (id) =>
    request(`/admin/announcements/${id}`, { method: 'DELETE' }),
};