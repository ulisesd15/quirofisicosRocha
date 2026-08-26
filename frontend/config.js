// frontend/config.js
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001/api' : '/api');

export const apiUrl = (route, params = {}) => {
  if (typeof route === 'string') return `${API_BASE}${route}`;
  return `${API_BASE}${route(params)}`;
};

export const API_ROUTES = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    google: '/auth/google',
    profile: '/auth/profile',
  },

  menuItems: '/menu-items',
  menuItem: (id) => `/menu-items/${id}`,
  menuItemCustomize: (id) => `/menu-items/${id}/customize`,

  orders: '/orders',
  myOrders: '/orders/my-orders',
  order: (id) => `/orders/${id}`,

  admin: {
    stats: '/admin/stats',
    all: '/admin/all',
  },
};