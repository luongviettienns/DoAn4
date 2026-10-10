import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api, ApiError, ACCESS_TOKEN_EVENT, invalidateAuthRequests, storeAccessToken, type ApiUser, type ApiGoogleLoginResponse } from '../services/api';

interface AuthContextType {
  user: ApiUser | null;
  token: string | null;
  isRestoring: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; phone: string; password: string; fullName: string }) => Promise<void>;
  loginWithGoogle: (credential: string, phone?: string) => Promise<ApiGoogleLoginResponse>;
  completeGoogleRegistration: (tempToken: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cinex_token'));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const sessionGeneration = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const generation = sessionGeneration.current;
    const isCurrent = () => !cancelled && generation === sessionGeneration.current;
    const syncStoredToken = () => setToken(localStorage.getItem('cinex_token'));
    window.addEventListener(ACCESS_TOKEN_EVENT, syncStoredToken);

    const restoreSession = async () => {
      try {
        const initialToken = localStorage.getItem('cinex_token');
        let accessToken = initialToken;
        if (!accessToken) accessToken = (await api.refresh()).accessToken;
        if (!isCurrent()) return;
        let account: ApiUser;
        try {
          account = await api.getMe(accessToken);
        } catch (error) {
          if (!isCurrent()) return;
          if (!(error instanceof ApiError) || error.status !== 401) throw error;
          accessToken = (await api.refresh()).accessToken;
          if (!isCurrent()) return;
          account = await api.getMe(accessToken);
        }
        if (!isCurrent()) return;
        // A protected request may have rotated this same session while /me was pending.
        const currentToken = localStorage.getItem('cinex_token');
        if (currentToken && currentToken !== initialToken) accessToken = currentToken;
        setToken(accessToken);
        setUser(account);
        storeAccessToken(accessToken);
      } catch (error) {
        // Offline/5xx does not prove the user's credentials were revoked.
        if (isCurrent() && error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          storeAccessToken(null);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isCurrent()) setIsRestoring(false);
      }
    };
    void restoreSession();
    return () => { cancelled = true; window.removeEventListener(ACCESS_TOKEN_EVENT, syncStoredToken); };
  }, []);

  const login = async (email: string, password: string) => {
    const generation = ++sessionGeneration.current;
    invalidateAuthRequests();
    try {
      const res = await api.login(email, password);
      if (generation !== sessionGeneration.current) return;
      invalidateAuthRequests();
      setToken(res.accessToken);
      setUser(res.user);
      storeAccessToken(res.accessToken);
      setIsAuthModalOpen(false);
    } finally {
      if (generation === sessionGeneration.current) setIsRestoring(false);
    }
  };

  const register = async (data: { email: string; phone: string; password: string; fullName: string }) => {
    const generation = ++sessionGeneration.current;
    invalidateAuthRequests();
    try {
      const res = await api.register(data);
      if (generation !== sessionGeneration.current) return;
      invalidateAuthRequests();
      setToken(res.accessToken);
      setUser(res.user);
      storeAccessToken(res.accessToken);
      setIsAuthModalOpen(false);
    } finally {
      if (generation === sessionGeneration.current) setIsRestoring(false);
    }
  };

  const loginWithGoogle = async (credential: string, phone?: string): Promise<ApiGoogleLoginResponse> => {
    const generation = ++sessionGeneration.current;
    invalidateAuthRequests();
    try {
      const res = await api.googleLogin(credential, phone);
      if (generation !== sessionGeneration.current) return res;
      if (!res.requirePhone && res.accessToken && res.user) {
        invalidateAuthRequests();
        setToken(res.accessToken);
        setUser(res.user);
        storeAccessToken(res.accessToken);
        setIsAuthModalOpen(false);
      }
      return res;
    } finally {
      if (generation === sessionGeneration.current) setIsRestoring(false);
    }
  };

  const completeGoogleRegistration = async (tempToken: string, phone: string) => {
    const generation = ++sessionGeneration.current;
    invalidateAuthRequests();
    try {
      const res = await api.completeGoogleRegistration(tempToken, phone);
      if (generation !== sessionGeneration.current) return;
      invalidateAuthRequests();
      setToken(res.accessToken);
      setUser(res.user);
      storeAccessToken(res.accessToken);
      setIsAuthModalOpen(false);
    } finally {
      if (generation === sessionGeneration.current) setIsRestoring(false);
    }
  };

  const logout = async () => {
    ++sessionGeneration.current;
    invalidateAuthRequests();
    setToken(null);
    setUser(null);
    setIsRestoring(false);
    storeAccessToken(null);
    try {
      await api.logout();
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isRestoring,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        login,
        register,
        loginWithGoogle,
        completeGoogleRegistration,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// oxlint-disable-next-line react/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
