import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, type ApiUser } from '../services/api';

interface AuthContextType {
  user: ApiUser | null;
  token: string | null;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; phone: string; password: string; fullName: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cinex_token'));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (token) {
      api.getMe(token)
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem('cinex_token');
          setToken(null);
          setUser(null);
        });
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setToken(res.accessToken);
    setUser(res.user);
    localStorage.setItem('cinex_token', res.accessToken);
    setIsAuthModalOpen(false);
  };

  const register = async (data: { email: string; phone: string; password: string; fullName: string }) => {
    const res = await api.register(data);
    setToken(res.accessToken);
    setUser(res.user);
    localStorage.setItem('cinex_token', res.accessToken);
    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('cinex_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
