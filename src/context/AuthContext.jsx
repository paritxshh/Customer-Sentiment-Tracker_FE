import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AUTH_KEY = 'sentinel_auth';

function readStored() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { token: null, user: null };
    const data = JSON.parse(raw);
    if (data?.token && data?.user) return { token: data.token, user: data.user };
  } catch (_) {}
  return { token: null, user: null };
}

function writeStored(token, user) {
  if (token && user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStored);

  useEffect(() => {
    writeStored(auth.token, auth.user);
  }, [auth.token, auth.user]);

  const login = useCallback((token, user) => {
    setAuth({ token, user });
  }, []);

  const logout = useCallback(() => {
    setAuth({ token: null, user: null });
  }, []);

  const value = {
    token: auth.token,
    user: auth.user,
    isAuthenticated: !!auth.token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
