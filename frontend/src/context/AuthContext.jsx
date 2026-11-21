import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyStoredSession = async () => {
      const token = localStorage.getItem('crs_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('crs_token');
          setUser(null);
        }
      } catch (err) {
        localStorage.removeItem('crs_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyStoredSession();
  }, []);

  const login = async (email, password, expectedRole) => {
    const { data } = await api.post('/auth/login', {
      email,
      password,
      expectedRole,
    });
    localStorage.setItem('crs_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async ({ name, email, password, studentId }) => {
    const { data } = await api.post('/auth/register', {
      name,
      email,
      password,
      studentId,
    });
    localStorage.setItem('crs_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('crs_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
