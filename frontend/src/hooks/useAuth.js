import { useState, useEffect, useCallback } from 'react';

export function useAuth() {
  const [authState, setAuthState] = useState(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    let user = null;
    
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        user = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error("Error parsing stored user:", error);
    }

    // Fallback user builder if complete user object is missing
    if (!user && token) {
      user = {
        id: localStorage.getItem('userId'),
        fullName: localStorage.getItem('userName'),
        email: localStorage.getItem('userEmail'),
        phone: localStorage.getItem('userPhone'),
        role: localStorage.getItem('userRole') || 'user',
      };
    }

    const isLoggedIn = Boolean(token);
    const isAdmin = localStorage.getItem('userRole') === 'admin' || user?.role === 'admin';

    return {
      isLoggedIn,
      user: isLoggedIn ? user : null,
      isAdmin,
      loading: false,
    };
  });

  // Sync state when login/logout events occur in the same or other tabs
  useEffect(() => {
    const syncAuthState = () => {
      const token = localStorage.getItem('token') || localStorage.getItem('userToken');
      let currentUser = null;

      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          currentUser = JSON.parse(storedUser);
        }
      } catch (error) {
        console.error("Error parsing stored user:", error);
      }

      if (!currentUser && token) {
        currentUser = {
          id: localStorage.getItem('userId'),
          fullName: localStorage.getItem('userName'),
          email: localStorage.getItem('userEmail'),
          phone: localStorage.getItem('userPhone'),
          role: localStorage.getItem('userRole') || 'user',
        };
      }

      const loggedIn = Boolean(token);
      const admin = localStorage.getItem('userRole') === 'admin' || currentUser?.role === 'admin';

      setAuthState({
        isLoggedIn: loggedIn,
        user: loggedIn ? currentUser : null,
        isAdmin: admin,
        loading: false,
      });
    };

    window.addEventListener("authChange", syncAuthState);
    window.addEventListener("storage", syncAuthState);

    return () => {
      window.removeEventListener("authChange", syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, []);

  const logout = useCallback(() => {
    if (window.authManager && typeof window.authManager.logout === "function") {
      window.authManager.logout();
    } else {
      // Selectively remove auth keys instead of wiping entire localStorage
      const authKeys = [
        "token",
        "userToken",
        "user",
        "userId",
        "userName",
        "userEmail",
        "userPhone",
        "userRole",
      ];
      authKeys.forEach((key) => localStorage.removeItem(key));
      window.dispatchEvent(new Event("authChange"));
    }
  }, []);

  return {
    ...authState,
    logout,
  };
}

export default useAuth;