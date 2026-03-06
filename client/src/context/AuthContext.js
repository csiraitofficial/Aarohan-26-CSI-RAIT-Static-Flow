import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// FIXED: Port 5000 matches your server .env
const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('campusflow_token');
    const savedUser = localStorage.getItem('campusflow_user');
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API}/api/auth/login`, { email, password });
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('campusflow_token', newToken);
      localStorage.setItem('campusflow_user', JSON.stringify(newUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Login failed" };
    }
  };

  const register = async (data) => {
    try {
      const res = await axios.post(`${API}/api/auth/register`, data);
      return { success: true, data: res.data };
    } catch (err) {
      console.error("Auth Error:", err.message);
      return { 
        success: false, 
        message: err.response?.data?.message || "Server connection failed. Check port 5000." 
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.clear();
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user, token, loading, login, register, logout,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
    isCommittee: user?.role === 'committee' || user?.role === 'admin',
    isStudent: user?.role === 'student',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

export default AuthContext;