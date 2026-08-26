import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEYS = [
  'user_token',
  'token',
  'user_id',
  'user_name',
  'user_email',
  'user_phone',
  'user_role',
  'user',
];

function getStoredToken() {
  return localStorage.getItem('token') || localStorage.getItem('user_token');
}

function getStoredUser() {
  try {
    const saved = localStorage.getItem('user');
    if (saved) return JSON.parse(saved);

    const id = localStorage.getItem('user_id');
    if (!id) return null;

    return {
      id,
      fullName: localStorage.getItem('user_name') || '',
      email: localStorage.getItem('user_email') || '',
      phone: localStorage.getItem('user_phone') || '',
      role: localStorage.getItem('user_role') || 'user',
    };
  } catch {
    return null;
  }
}

function normalizeUser(user = {}) {
  return {
    id: user.id,
    fullName: user.fullName || user.full_name || user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'user',
    authProvider: user.authProvider || user.auth_provider || 'local',
  };
}

function persistSession(token, rawUser) {
  const user = normalizeUser(rawUser);

  // Keep old keys temporarily so legacy pages do not break during migration.
  localStorage.setItem('token', token);
  localStorage.setItem('user_token', token);
  localStorage.setItem('user_id', String(user.id || ''));
  localStorage.setItem('user_name', user.fullName);
  localStorage.setItem('user_email', user.email);
  localStorage.setItem('user_phone', user.phone);
  localStorage.setItem('user_role', user.role);
  localStorage.setItem('user', JSON.stringify(user));

  return user;
}

function clearSession() {
  STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback((newToken, rawUser) => {
    const normalizedUser = persistSession(newToken, rawUser);

    setToken(newToken);
    setUser(normalizedUser);

    return normalizedUser;
  }, []);

  const authFetch = useCallback(
    async (url, options = {}) => {
      const activeToken = token || getStoredToken();

      const headers = {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
        ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 || response.status === 403) {
        logout();
      }

      return response;
    },
    [logout, token]
  );

  const refreshProfile = useCallback(
    async (overrideToken) => {
      const activeToken = overrideToken || token || getStoredToken();

      if (!activeToken) {
        return null;
      }

      const response = await fetch('/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (!response.ok) {
        logout();
        return null;
      }

      const profile = await response.json();
      const normalizedUser = persistSession(activeToken, profile);

      setToken(activeToken);
      setUser(normalizedUser);

      return normalizedUser;
    },
    [logout, token]
  );

  useEffect(() => {
    let isMounted = true;

    async function validateExistingSession() {
      const savedToken = getStoredToken();

      if (!savedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        await refreshProfile(savedToken);
      } catch {
        // Network failure does not necessarily mean the token is invalid.
        // Keep the locally stored session and let protected requests verify it.
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    validateExistingSession();

    return () => {
      isMounted = false;
    };
  }, [refreshProfile]);

  const value = useMemo(
    () => ({
      token,
      user,
      isLoading,
      isLoggedIn: Boolean(token),
      isAdmin: user?.role === 'admin',
      login,
      logout,
      authFetch,
      refreshProfile,
    }),
    [authFetch, isLoading, login, logout, refreshProfile, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}