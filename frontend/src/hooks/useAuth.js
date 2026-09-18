// frontend/src/hooks/useAuth.js
import { useState, useEffect, useCallback } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);      // { id, fullName, email, phone, ... } or null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch current user/session on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchMe() {
      try {
        setLoading(true);
        setError(null);

        // Adjust this URL to match your backend (e.g. /api/me, /api/auth/me, etc.)
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!res.ok) {
          // Not logged in or error
          if (!isMounted) return;
          setUser(null);
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (!isMounted) return;

        // Expect something like { id, fullName, email, phone, ... }
        setUser(data || null);
        setLoading(false);
      } catch (err) {
        console.error('useAuth: error fetching current user', err);
        if (!isMounted) return;
        setUser(null);
        setError(err);
        setLoading(false);
      }
    }

    fetchMe();

    return () => {
      isMounted = false;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      // Adjust to your logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('useAuth: logout error', err);
    } finally {
      setUser(null);
    }
  }, []);

  const isLoggedIn = !!user;

  return {
    user,
    isLoggedIn,
    loading,
    error,
    logout,
  };
}

export default useAuth;