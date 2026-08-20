/**
 * AuthContext.jsx
 *
 * React replacement for the old auth.js AuthManager. Holds the current
 * session (token + user info) in state, hydrated from localStorage, and
 * exposes login/logout/refresh helpers to the rest of the app via useAuth().
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../api/authService';
import { clearSession, getToken, storeSession } from '../api/client';

const AuthContext = createContext(null);

function readStoredUser() {
  const token = getToken();
  if (!token) return null;
  return {
    id: localStorage.getItem('user_id'),
    fullName: localStorage.getItem('user_name') || '',
    email: localStorage.getItem('user_email') || '',
    phone: localStorage.getItem('user_phone') || '',
    role: localStorage.getItem('user_role') || 'user',
    token,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(true);

  // On mount, validate the stored token against the backend so a stale/expired
  // token doesn't leave the UI stuck in a "logged in" state.
  useEffect(() => {
    let mounted = true;

    async function validate() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await authService.getProfile();
        if (!mounted) return;
        storeSession(token, profile);
        setUser({ ...profile, token });
      } catch {
        if (!mounted) return;
        clearSession();
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    validate();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback((token, userData) => {
    storeSession(token, userData);
    setUser({ ...userData, token });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isLoggedIn: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      logout,
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
