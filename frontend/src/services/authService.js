import api from './api';

class AuthService {
  
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error.response?.data || { message: 'Anmeldung fehlgeschlagen' };
    }
  }

  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error.response?.data || { message: 'Registrierung fehlgeschlagen' };
    }
  }

  async verifyEmail(token) {
    try {
      const response = await api.get(`/auth/verify-email/${token}`);
      return response.data;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error.response?.data || { message: 'E-Mail-Verifizierung fehlgeschlagen' };
    }
  }

  async resendVerification(email) {
    try {
      const response = await api.post('/auth/resend-verification', { email });
      return response.data;
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error.response?.data || { message: 'E-Mail-Versendung fehlgeschlagen' };
    }
  }

  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error.response?.data || { message: 'Passwort-Reset fehlgeschlagen' };
    }
  }

  async resetPassword(token, password, confirmPassword) {
    try {
      const response = await api.post(`/auth/reset-password/${token}`, { 
        password, 
        confirmPassword 
      });
      return response.data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error.response?.data || { message: 'Passwort-Reset fehlgeschlagen' };
    }
  }

  async validateToken() {
    try {
      const response = await api.get('/auth/validate');
      return response.data;
    } catch (error) {
      console.error('Token validation error:', error);
      this.logout();
      throw error.response?.data || { message: 'Token-Validierung fehlgeschlagen' };
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  getCurrentUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  getToken() {
    return localStorage.getItem('token');
  }

  isAuthenticated() {
    const token = this.getToken();
    return !!token;
  }

  isAdmin() {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }
}

const authServiceInstance = new AuthService();
export default authServiceInstance;