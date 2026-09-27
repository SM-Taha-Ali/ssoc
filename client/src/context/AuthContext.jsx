import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ssoc_token'));
  const [company, setCompany] = useState(() => {
    const saved = localStorage.getItem('ssoc_company');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Set default header if token exists on boot
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Interceptor to handle unexpected 401s
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401 && !error.config.url?.includes('/api/auth/')) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Verify session on mount
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('ssoc_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        const res = await axios.get('/api/auth/me');
        if (res.data?.company) {
          setCompany(res.data.company);
          localStorage.setItem('ssoc_company', JSON.stringify(res.data.company));
        }
      } catch (err) {
        console.warn('[Auth] Stored session invalid, resetting.');
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = async (companyName, password) => {
    const res = await axios.post('/api/auth/login', { companyName, password });
    const { token: receivedToken, company: receivedCompany } = res.data;

    localStorage.setItem('ssoc_token', receivedToken);
    localStorage.setItem('ssoc_company', JSON.stringify(receivedCompany));
    axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;

    setToken(receivedToken);
    setCompany(receivedCompany);
    return res.data;
  };

  const register = async (companyName, password) => {
    const res = await axios.post('/api/auth/register', { companyName, password });
    const { token: receivedToken, company: receivedCompany } = res.data;

    localStorage.setItem('ssoc_token', receivedToken);
    localStorage.setItem('ssoc_company', JSON.stringify(receivedCompany));
    axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;

    setToken(receivedToken);
    setCompany(receivedCompany);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('ssoc_token');
    localStorage.removeItem('ssoc_company');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setCompany(null);
  };

  const value = {
    token,
    company,
    isAuthenticated: !!token && !!company,
    isLoading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
