import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('brightloop_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('brightloop_token'));
  const [loading, setLoading] = useState(true);

  // Sync token and user with API /auth/me on initial load
  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('brightloop_token');
      if (!savedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.me();
        setUser(response.user);
        localStorage.setItem('brightloop_user', JSON.stringify(response.user));
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('brightloop_token');
        localStorage.removeItem('brightloop_user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = useCallback((authData) => {
    localStorage.setItem('brightloop_token', authData.token);
    localStorage.setItem('brightloop_user', JSON.stringify(authData.user));
    setToken(authData.token);
    setUser(authData.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('brightloop_token');
    localStorage.removeItem('brightloop_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const hasRole = useCallback(
    (...roles) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

