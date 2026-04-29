import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'engineer' | 'manager' | 'fsm' | 'stakeholder' | 'ooh_manager';

interface AuthUser {
  name:                string;
  email:               string;
  role:                UserRole;
  trade?:              string;
  session?:            string;
  engineerId?:         string;
  managedEngineerIds?: string[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user:            AuthUser | null;
  login:           (userData: AuthUser) => void;
  logout:          () => Promise<void>;
  isLoading:       boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ These match exactly what Login.tsx writes to
const SESSION_KEY   = 'user_session';
const USER_DATA_KEY = 'user_data';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user,      setUser]      = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AUTH INIT - Starting...');

    // ✅ Read from sessionStorage — works in iframes (localStorage is blocked)
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    const rawData   = sessionStorage.getItem(USER_DATA_KEY);

    if (sessionId && rawData) {
      try {
        const parsed = JSON.parse(rawData);
        const authUser: AuthUser = {
          name:    parsed.name  || 'Unknown User',
          email:   parsed.email || '',
          role:    'manager',
          trade:   parsed.trade   || 'ALL',
          session: parsed.session || sessionId,
        };
        console.log(`✅ Session user loaded: ${authUser.name}`);
        setUser(authUser);
        setIsLoading(false);
        return;
      } catch (err) {
        console.error('❌ Failed to parse user_data:', err);
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(USER_DATA_KEY);
      }
    }

    // No session found
    console.log('ℹ️ No session found — showing login');
    setIsLoading(false);
  }, []);

  const login = (userData: AuthUser) => {
    setUser(userData);
    // ✅ Write to sessionStorage — not localStorage
    sessionStorage.setItem(SESSION_KEY,   userData.session || '');
    sessionStorage.setItem(USER_DATA_KEY, JSON.stringify({
      name:    userData.name,
      email:   userData.email,
      session: userData.session,
      trade:   userData.trade,
    }));
  };

  const logout = async () => {
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    try {
      if (sessionId) {
        await fetch(`/api/auth/logout/${sessionId}`, { method: 'POST' });
      }
    } catch (err) {
      console.error('Logout API call failed:', err);
    } finally {
      setUser(null);
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(USER_DATA_KEY);
    }
  };

  console.log(`🎨 AuthProvider RENDER - loading: ${isLoading} user: ${user?.name ?? 'undefined'}`);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
