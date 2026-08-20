/**
 * client.js
 *
 * Thin fetch wrapper shared by every service module.
 * - Attaches the JWT bearer token (when present) to every request.
 * - Serializes JSON bodies automatically.
 * - Normalizes errors so callers can rely on `error.message` and `error.status`.
 * - On 401/403 it clears the stored session so the app falls back to a logged-out state.
 *   (Redirecting is left to the caller/AuthContext so React Router stays in control of navigation.)
 */

const TOKEN_KEYS = ['user_token', 'token'];

export function getToken() {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return null;
}

export function clearSession() {
  [
    'user_token',
    'token',
    'user_id',
    'user_name',
    'user_email',
    'user_phone',
    'user_role',
  ].forEach((key) => localStorage.removeItem(key));
}

export function storeSession(token, user) {
  localStorage.setItem('user_token', token);
  localStorage.setItem('token', token);
  if (user) {
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('user_name', user.fullName || user.full_name || user.name || '');
    localStorage.setItem('user_email', user.email || '');
    localStorage.setItem('user_phone', user.phone || '');
    localStorage.setItem('user_role', user.role || 'user');
  }
}

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Core request helper. Pass a relative path like '/api/auth/login'.
 * `options.auth` (default true) controls whether the bearer token is attached.
 */
export async function apiRequest(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const finalHeaders = { 'Content-Type': 'application/json', ...headers };

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(path, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new ApiError('No se pudo conectar con el servidor', 0, null);
  }

  if (response.status === 401 || response.status === 403) {
    clearSession();
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message = (payload && (payload.error || payload.message)) || `Error ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};

export { ApiError };
