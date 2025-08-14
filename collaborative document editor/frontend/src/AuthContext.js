import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // In a real app, you'd validate the token with the server
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email,
        password,
      });
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/api/register', {
        username,
        email,
        password,
      });
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
