import React, { createContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = sessionStorage.getItem('token');
      const savedUser = sessionStorage.getItem('user');
      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
        setLoading(false); // Unblock the UI immediately using cached user
        try {
          const res = await axiosClient.get('/auth/me');
          const userData = res.data.user || res.data;
          if (userData && userData.username) {
            setUser(userData);
            sessionStorage.setItem('user', JSON.stringify(userData));
          }
        } catch (error) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          setUser(null);
        }
      } else {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (username, password) => {
    const res = await axiosClient.post('/auth/login', { username, password });
    const token = res.data.token;
    const userData = res.data.user || { username, role: res.data.role };
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (username, password, name) => {
    const res = await axiosClient.post('/auth/register', { username, password, name });
    const token = res.data.token;
    const userData = res.data.user || { username, role: res.data.role || 'participant', name };
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    // Non-blocking background logout call
    axiosClient.post('/auth/logout').catch(console.error);
    
    // Immediately clear session and redirect
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
