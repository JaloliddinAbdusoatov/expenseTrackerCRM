import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  avatarUrl?: string;
  role: 'user' | 'admin' | 'superadmin' | 'viewer_admin';
  isBlocked?: boolean;
  currency: 'USD' | 'UZS' | 'JPY' | 'RUB';
}

export interface RegistrationState {
  email: string;
  emailVerified: boolean;
  timestamp: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  registrationState: RegistrationState | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string; verificationToken?: string }>;
  logout: () => void;
  verifyEmail: (token: string, email?: string) => Promise<{ success: boolean; error?: string; email?: string }>;
  saveRegistrationState: (email: string, emailVerified: boolean) => void;
  clearRegistrationState: () => void;
  checkUserExists: (email: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REGISTRATION_STATE_KEY = 'registration_state';
const REGISTRATION_STATE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_EXPIRES_AT_KEY = 'session_expires_at';
const SESSION_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours
const LAST_ACTIVITY_AT_KEY = 'last_activity_at';
const ACTIVITY_WRITE_THROTTLE_MS = 60 * 1000; // write once per minute

const getSessionExpiresAt = (): number | null => {
  try {
    const raw = localStorage.getItem(SESSION_EXPIRES_AT_KEY);
    if (!raw) return null;
    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
    return timestamp;
  } catch {
    return null;
  }
};

const isSessionExpired = (): boolean => {
  const expiresAt = getSessionExpiresAt();
  if (!expiresAt) return false;
  return Date.now() > expiresAt;
};

const setSessionExpiry = () => {
  localStorage.setItem(SESSION_EXPIRES_AT_KEY, String(Date.now() + SESSION_EXPIRY_MS));
};

const getLastActivityAt = (): number | null => {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_AT_KEY);
    if (!raw) return null;
    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
    return timestamp;
  } catch {
    return null;
  }
};

const isIdleExpired = (): boolean => {
  const lastActivityAt = getLastActivityAt();
  if (!lastActivityAt) return false;
  return Date.now() - lastActivityAt > SESSION_EXPIRY_MS;
};

const setLastActivityNow = () => {
  localStorage.setItem(LAST_ACTIVITY_AT_KEY, String(Date.now()));
};

const getRegistrationState = (): RegistrationState | null => {
  try {
    const stored = localStorage.getItem(REGISTRATION_STATE_KEY);
    if (!stored) return null;
    
    const state: RegistrationState = JSON.parse(stored);
    const now = Date.now();
    
    // Check if state is expired
    if (now - state.timestamp > REGISTRATION_STATE_EXPIRY) {
      localStorage.removeItem(REGISTRATION_STATE_KEY);
      return null;
    }
    
    return state;
  } catch {
    return null;
  }
};

const saveRegistrationState = (state: RegistrationState | null) => {
  if (state) {
    localStorage.setItem(REGISTRATION_STATE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(REGISTRATION_STATE_KEY);
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [registrationState, setRegistrationState] = useState<RegistrationState | null>(null);

  const logout = () => {
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_username');
    localStorage.removeItem('user_email_verified');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_currency');
    localStorage.removeItem('auth_token');
    localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
    localStorage.removeItem(LAST_ACTIVITY_AT_KEY);
    localStorage.removeItem(REGISTRATION_STATE_KEY);
    setUser(null);
    setRegistrationState(null);
  };

  const clearRegistrationStateFromContext = () => {
    saveRegistrationState(null);
    setRegistrationState(null);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (isSessionExpired() || isIdleExpired()) {
        logout();
        setIsLoading(false);
        return;
      }

      // Check for existing session
      const userId = localStorage.getItem('user_id');
      const userEmail = localStorage.getItem('user_email');
      const username = localStorage.getItem('user_username');
      const emailVerified = localStorage.getItem('user_email_verified') === 'true';

      if (userId && userEmail && username) {
        // Verify user still exists on backend
        try {
          const profile = await authApi.getProfile(userId);
          setUser({
            id: userId,
            email: userEmail,
            username: profile.username || username,
            emailVerified: profile.emailVerified ?? emailVerified,
            avatarUrl: profile.avatarUrl,
            role:
              profile.role ||
              (localStorage.getItem('user_role') as 'user' | 'admin' | 'superadmin' | 'viewer_admin') ||
              'user',
            isBlocked: profile.isBlocked,
            currency: profile.currency || (localStorage.getItem('user_currency') as 'USD' | 'UZS' | 'JPY' | 'RUB') || 'USD',
          });
        } catch {
          // User no longer exists or session invalid, clear everything
          logout();
        }
      } else {
        // Check for incomplete registration
        const regState = getRegistrationState();
        if (regState) {
          setRegistrationState(regState);
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let lastWriteAt = 0;

    const trackActivity = () => {
      const now = Date.now();
      if (now - lastWriteAt < ACTIVITY_WRITE_THROTTLE_MS) return;
      lastWriteAt = now;
      setLastActivityNow();
      setSessionExpiry(); // sliding session on user activity
    };

    const events: Array<keyof WindowEventMap> = [
      'click',
      'keydown',
      'mousemove',
      'scroll',
      'touchstart',
    ];

    events.forEach((eventName) => window.addEventListener(eventName, trackActivity, { passive: true }));

    const interval = window.setInterval(() => {
      if (user && (isSessionExpired() || isIdleExpired())) {
        logout();
      }
    }, 60 * 1000);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, trackActivity));
      window.clearInterval(interval);
    };
  }, [user]);

  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      // Try to login with a dummy password to check if user exists
      // This is not ideal but works for now. Better would be a dedicated endpoint
      await authApi.login(email, 'dummy');
      return true;
    } catch (error: any) {
      // Check if error is about wrong password (user exists) or user not found
      if (error.message?.includes('Invalid email or password')) {
        // User exists but password is wrong
        return true;
      }
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Clear any incomplete registration state
      clearRegistrationStateFromContext();
      
      const response = await authApi.login(email, password);
      
      // Save user data to localStorage
      localStorage.setItem('user_id', response.userId);
      localStorage.setItem('user_email', email);
      localStorage.setItem('user_email_verified', response.emailVerified.toString());
      setSessionExpiry();
      setLastActivityNow();
      
      // Get full profile
      try {
        const profile = await authApi.getProfile(response.userId);
        localStorage.setItem('user_username', profile.username || 'User');
        localStorage.setItem('user_role', profile.role || 'user');
        localStorage.setItem('user_currency', profile.currency || 'USD');
        
        setUser({
          id: response.userId,
          email,
          username: profile.username || 'User',
          emailVerified: response.emailVerified,
          avatarUrl: profile.avatarUrl,
          role: profile.role || 'user',
          isBlocked: profile.isBlocked,
          currency: profile.currency || 'USD',
        });
      } catch {
        // Fallback if profile fetch fails
        setUser({
          id: response.userId,
          email,
          username: email.split('@')[0],
          emailVerified: response.emailVerified,
          role: 'user',
          currency: 'USD',
        });
        localStorage.setItem('user_role', 'user');
        localStorage.setItem('user_currency', 'USD');
      }

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Неверный email или пароль';
      
      // Check if user exists but is not fully registered
      if (errorMessage.includes('Email must be verified')) {
        return { 
          success: false, 
          error: 'Email не верифицирован. Пожалуйста, завершите регистрацию.' 
        };
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const register = async (email: string, password: string, username: string) => {
    try {
      // Validate
      if (!email || !password || !username) {
        return { success: false, error: 'Заполните все поля' };
      }

      if (password.length < 6) {
        return { success: false, error: 'Пароль должен быть не менее 6 символов' };
      }

      // Check that email was verified
      const currentRegState = getRegistrationState();
      if (!currentRegState || currentRegState.email !== email || !currentRegState.emailVerified) {
        return { 
          success: false, 
          error: 'Email должен быть верифицирован перед регистрацией' 
        };
      }

      const response = await authApi.register(email, username, password);
      
      // Clear registration state
      clearRegistrationStateFromContext();
      
      // Save user data - email is already verified before registration
      localStorage.setItem('user_id', response.userId);
      localStorage.setItem('user_email', email);
      localStorage.setItem('user_username', username);
      localStorage.setItem('user_email_verified', 'true');
      localStorage.setItem('user_role', 'user');
      localStorage.setItem('user_currency', 'USD');
      setSessionExpiry();
      setLastActivityNow();

      setUser({
        id: response.userId,
        email,
        username,
        emailVerified: true, // Already verified before registration
        role: 'user',
        currency: 'USD',
      });

      return { 
        success: true,
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка регистрации';
      
      // Handle specific error messages
      if (errorMessage.includes('already registered')) {
        return { success: false, error: 'Этот email уже зарегистрирован' };
      }
      if (errorMessage.includes('already taken')) {
        return { success: false, error: 'Этот username уже занят' };
      }
      if (errorMessage.includes('must be verified')) {
        return { success: false, error: 'Email должен быть верифицирован перед регистрацией' };
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const verifyEmail = async (token: string, email?: string) => {
    try {
      const result = await authApi.verifyEmail(token);
      const verifiedEmail = result.email || email;
      
      if (!verifiedEmail) {
        return { 
          success: false, 
          error: 'Email не найден в токене верификации' 
        };
      }

      // Save registration state
      const regState: RegistrationState = {
        email: verifiedEmail,
        emailVerified: true,
        timestamp: Date.now(),
      };
      saveRegistrationState(regState);
      setRegistrationState(regState);
      
      // Update user email verification status if user is logged in
      if (user) {
        localStorage.setItem('user_email_verified', 'true');
        setUser((prev) => prev ? { ...prev, emailVerified: true } : null);
      }
      
      return { success: true, email: verifiedEmail };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Недействительный или истекший токен' 
      };
    }
  };

  const saveRegistrationStateToContext = (email: string, emailVerified: boolean) => {
    const regState: RegistrationState = {
      email,
      emailVerified,
      timestamp: Date.now(),
    };
    saveRegistrationState(regState);
    setRegistrationState(regState);
  };

  const refreshUser = async () => {
    if (isSessionExpired() || isIdleExpired()) {
      logout();
      return;
    }

    const userId = localStorage.getItem('user_id');
    const userEmail = localStorage.getItem('user_email');
    const username = localStorage.getItem('user_username');
    const emailVerified = localStorage.getItem('user_email_verified') === 'true';

    if (userId && (userEmail || username)) {
      try {
        const profile = await authApi.getProfile(userId);
        const email = profile.email || userEmail;
        if (profile.email) localStorage.setItem('user_email', profile.email);
        if (profile.role) localStorage.setItem('user_role', profile.role);
        if (profile.currency) localStorage.setItem('user_currency', profile.currency);
        setUser({
          id: userId,
          email: email || '',
          username: profile.username || username || '',
          emailVerified: profile.emailVerified ?? emailVerified,
          avatarUrl: profile.avatarUrl,
          role:
            profile.role ||
            (localStorage.getItem('user_role') as 'user' | 'admin' | 'superadmin' | 'viewer_admin') ||
            'user',
          isBlocked: profile.isBlocked,
          currency: profile.currency || (localStorage.getItem('user_currency') as 'USD' | 'UZS' | 'JPY' | 'RUB') || 'USD',
        });
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      registrationState,
      login, 
      register, 
      logout, 
      verifyEmail,
      saveRegistrationState: saveRegistrationStateToContext,
      clearRegistrationState: clearRegistrationStateFromContext,
      checkUserExists,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
