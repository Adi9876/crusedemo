import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  phone: string;
  dateOfBirth: Date;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  profile?: {
    country: string;
    postalCode: string;
    city: string;
    addressLine1: string;
    kycStatus: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get<{ success: boolean; data: { user: User } }>('/auth/me');
      if (response.success) {
        setUser(response.data.user);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch user', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<{ 
      success: boolean; 
      data: { user: User; tokens: { accessToken: string; refreshToken: string } } 
    }>('/auth/login', { email, password });
    
    if (response.success) {
      localStorage.setItem('accessToken', response.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
      setUser(response.data.user);
    }
  };

  const register = async (data: any) => {
    const response = await api.post<{ 
      success: boolean; 
      data: { user: User; tokens: { accessToken: string; refreshToken: string } } 
    }>('/auth/register', { ...data, acceptTerms: true });
    
    if (response.success) {
      localStorage.setItem('accessToken', response.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
      setUser(response.data.user);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (error) {
        console.error('Logout API failed:', error);
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
