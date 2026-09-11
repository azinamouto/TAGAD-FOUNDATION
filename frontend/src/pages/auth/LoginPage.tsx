import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../modules/auth/AuthContext';
import { validateLoginInput } from '../../lib/validation/auth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validateLoginInput(email, password);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-16 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <Link to="/" className="inline-block text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            TAGAD
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Personnel Sign In
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Municipality of Talibon • Gender and Development Portal
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="user@talibon.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className={`w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border rounded text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 ${
                  errors.email ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.email && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className={`w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border rounded text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 ${
                  errors.password ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.password && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Development Credentials */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="font-medium text-slate-700 dark:text-slate-300">Development Credentials:</div>
            <div>Email: <span className="font-mono text-slate-900 dark:text-slate-200">admin@talibon.gov.ph</span></div>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/"
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            ← Return to public portal
          </Link>
        </div>
      </div>
    </div>
  );
};

