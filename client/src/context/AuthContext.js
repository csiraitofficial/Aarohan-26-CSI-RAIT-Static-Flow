import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount — check saved token
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
        localStorage.removeItem('campusflow_token');
        localStorage.removeItem('campusflow_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/api/auth/login`, { email, password });
    const { token: newToken, user: newUser } = res.data;

    // Save to state
    setToken(newToken);
    setUser(newUser);

    // Save to localStorage
    localStorage.setItem('campusflow_token', newToken);
    localStorage.setItem('campusflow_user', JSON.stringify(newUser));

    // Set axios default header
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

    return res.data;
  };

  const register = async (data) => {
    const res = await axios.post(`${API}/api/auth/register`, data);
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('campusflow_token');
    localStorage.removeItem('campusflow_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
    isCommittee: user?.role === 'committee' || user?.role === 'admin',
    isStudent: user?.role === 'student',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

export default AuthContext;