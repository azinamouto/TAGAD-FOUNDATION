import React, { ReactNode } from 'react';
import { AuthProvider } from '../../modules/auth/AuthContext';
import { Toaster } from '../../components/ui/sonner';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
};
