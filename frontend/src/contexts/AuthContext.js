import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app load
    if (token) {
      // In a real app, you would validate the token with your backend
      // For now, we'll just set a mock user
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setToken(data.token);
        setUser(data.user);
        
        return { success: true, user: data.user, token: data.token };
      } else {
        throw new Error(data.message || 'Login fehlgeschlagen');
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      // Mock registration - replace with actual API call
      const mockUser = {
        id: Date.now(),
        email: userData.email,
        name: userData.name,
        role: 'customer'
      };
      
      const mockToken = 'mock-jwt-token';
      
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      setToken(mockToken);
      setUser(mockUser);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Neue Funktion für direktes Login mit Benutzerdaten (für Admin-Login)
  const loginWithUserData = (userData, userToken) => {
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
  };

  const value = {
    user,
    token,
    login,
    loginWithUserData,
    register,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;