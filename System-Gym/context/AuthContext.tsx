'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axios';
import { Cashier } from '../types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  cashier: Cashier | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<Cashier>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Robust Base64URL + UTF-8 JWT decoder that handles Arabic and Unicode characters
 */
const decodeJwtPayload = (token: string): any => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const isTokenExpired = (token: string): boolean => {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (payload && typeof payload.exp === 'number') {
    return payload.exp * 1000 < Date.now();
  }
  // Never falsely expire tokens if decoding is non-standard
  return false;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [cashier, setCashier] = useState<Cashier | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const token = localStorage.getItem('token');
      const saved = localStorage.getItem('cashier');
      if (token && !isTokenExpired(token) && saved) {
        return JSON.parse(saved);
      }
    } catch {
      return null;
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const token = localStorage.getItem('token');
      if (!token || isTokenExpired(token)) return false;
      const saved = localStorage.getItem('cashier');
      return !saved;
    } catch {
      return false;
    }
  });

  const router = useRouter();

  const clearAuthData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('cashier');
      sessionStorage.clear();
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
    }
    setCashier(null);
  };

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('token');
      const savedCashier = localStorage.getItem('cashier');

      if (!token || isTokenExpired(token)) {
        clearAuthData();
        setLoading(false);
        return;
      }

      if (savedCashier && !cashier) {
        try {
          const parsed = JSON.parse(savedCashier);
          setCashier(parsed);
        } catch {
          // ignore
        }
      }

      // Sync cookie so server / middleware is in harmony
      if (typeof document !== 'undefined') {
        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax;`;
      }

      setLoading(false);

      // Silent background verification with server
      try {
        const { data } = await api.get('/auth/me');
        const userObj: Cashier = {
          _id: data._id || data.id,
          name: data.name,
          username: data.username,
          role: data.role,
          shiftType: data.shiftType || undefined,
          active: data.active,
        };
        setCashier(userObj);
        localStorage.setItem('cashier', JSON.stringify(userObj));
      } catch (err: any) {
        // ONLY clear auth if the server explicitly rejects the token with 401
        if (err.response?.status === 401) {
          clearAuthData();
        }
      }
    };

    verifyAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);

    const cashierObj: Cashier = {
      _id: data.cashier.id || data.cashier._id,
      name: data.cashier.name,
      username: data.cashier.username,
      role: data.cashier.role,
      shiftType: data.cashier.shiftType || undefined,
      active: true,
    };

    localStorage.setItem('cashier', JSON.stringify(cashierObj));

    if (typeof document !== 'undefined') {
      document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax;`;
    }

    setCashier(cashierObj);
    return cashierObj;
  };

  const logout = () => {
    clearAuthData();
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        cashier,
        loading,
        isAuthenticated: !!cashier,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
