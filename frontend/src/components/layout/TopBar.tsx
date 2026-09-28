import { Logo } from '../common/Logo';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../modules/auth/AuthContext';
import { formatRole } from '../../lib/utils/cn';

export const TopBar: React.FC = () => {
  const { user, roles, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  const navLinks = [
    { label: 'Overview', path: '/dashboard' },
    { label: 'Programs', path: '/programs' },
    { label: 'GAD Plan', path: '/gad-plan' },
    { label: 'Beneficiaries', path: '/data-encoding' },
    { label: 'Reports', path: '/reports' },
  ];

  return (
    <header className="h-16 border-b border-border dark:border-border bg-card dark:bg-background sticky top-0 z-30 px-6">
      <div className="h-full max-w-7xl mx-auto flex items-center justify-between gap-6">
        {/* Zone 1: Brand Title (Strictly one line text element) */}
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
          <Logo size="sm" showSubtitle={false} />
        </Link>

        {/* Zone 2: Nav Links (4-6 links, single-line) */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-muted dark:bg-muted text-primary dark:text-primary'
                    : 'text-muted-foreground dark:text-foreground hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-muted/50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions / Profile & Logout */}
        <div className="flex items-center gap-3 shrink-0">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-foreground dark:text-foreground truncate max-w-[140px]">
                  {user.full_name}
                </span>
                <span className="text-[10px] text-primary dark:text-primary font-medium truncate max-w-[140px]">
                  {formatRole(roles[0] || 'User')}
                </span>
              </div>
              <button
                onClick={() => logout()}
                className="py-1.5 px-3 text-xs font-medium text-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted rounded-md border border-border dark:border-border transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="py-1.5 px-3.5 text-xs font-medium text-white bg-primary hover:bg-primary rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
