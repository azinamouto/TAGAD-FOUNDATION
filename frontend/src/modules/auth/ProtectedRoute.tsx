import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { AppRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, hasRole, sessionError } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium tracking-wide">
            Verifying TAGAD security credentials...
          </p>
        </div>
      </div>
    );
  }

  if (sessionError && !isAuthenticated) {
    return <main className="p-8 text-foreground bg-background" role="alert">
      <p>{sessionError}</p>
      <button onClick={() => window.location.reload()}>Retry verification</button>
      <a className="ml-4" href="/login">Sign in</a>
    </main>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-6 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-400 mb-6">
            Your authenticated role does not have authorization to view this GAD administrative module.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Return to Authorized Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
