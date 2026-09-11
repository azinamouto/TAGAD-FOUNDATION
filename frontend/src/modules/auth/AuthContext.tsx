import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppRole, AuthState, LoginCredentials, UserProfile } from '../../types';
import { authService } from './authService';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: AppRole | AppRole[]) => boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    roles: [],
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        const token = localStorage.getItem('tagad_token');
        if (user && token) {
          setState({
            user,
            roles: user.roles || [],
            token,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setState({
            user: null,
            roles: [],
            token: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch {
        setState({
          user: null,
          roles: [],
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    initAuth();
  }, []);

  const login = async ({ email, password }: LoginCredentials) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const result = await authService.login(email, password);
      localStorage.setItem('tagad_token', result.token);
      localStorage.setItem('tagad_user', JSON.stringify(result.user));
      localStorage.setItem('tagad_roles', JSON.stringify(result.roles));

      setState({
        user: result.user,
        roles: result.roles,
        token: result.token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await authService.logout();
    setState({
      user: null,
      roles: [],
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const hasRole = (role: AppRole | AppRole[]): boolean => {
    if (!state.user || !state.roles.length) return false;
    if (state.roles.includes('SUPER_ADMIN') || state.roles.includes('ADMIN')) return true;

    if (Array.isArray(role)) {
      return role.some((r) => state.roles.includes(r));
    }
    return state.roles.includes(role);
  };

  const isSuperAdmin = state.roles.includes('SUPER_ADMIN');
  const isAdmin = state.roles.includes('SUPER_ADMIN') || state.roles.includes('ADMIN');

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        hasRole,
        isSuperAdmin,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
