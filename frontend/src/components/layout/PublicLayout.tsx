import { Logo } from '../common/Logo';
import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { CommunityUnityIllustration } from '../common/CommunityUnityIllustration';

export const PublicLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Overview', to: '/' },
    { label: 'Demographics', to: '/demographics' },
    { label: 'Programs', to: '/public-programs' },
    { label: 'Accomplishments', to: '/public-accomplishments' },
    { label: 'Approved Plans', to: '/public-plans' },
    { label: 'Feedback', to: '/feedback' },
  ];

  return (
    <div className="min-h-screen bg-muted/50 dark:bg-background text-foreground dark:text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Institutional Top Bar */}
      <header className="border-b border-border dark:border-border bg-card/90 dark:bg-background/90 backdrop-blur-sm sticky top-0 z-40 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto h-16 flex items-center justify-between gap-6">
          {/* Brand Identity */}
          <Link
            to="/"
            className="flex items-center gap-3 shrink-0"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Logo size="sm" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={`text-xs font-medium transition-colors whitespace-nowrap py-1 ${
                    isActive
                      ? 'text-foreground dark:text-foreground font-semibold border-b-2 border-border dark:border-white'
                      : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white'
                  }`}
                >
                  {link.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Action / Official Login */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/login"
              className="py-1.5 px-3.5 text-xs font-medium text-foreground dark:text-foreground hover:text-foreground dark:hover:text-white border border-border dark:border-border hover:border-border dark:hover:border-border rounded transition-colors whitespace-nowrap"
            >
              Personnel Portal
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-muted-foreground dark:text-foreground hover:text-foreground transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border dark:border-border bg-card dark:bg-background px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 text-xs font-medium rounded transition-colors ${
                    isActive
                      ? 'bg-muted dark:bg-muted text-foreground dark:text-foreground font-semibold'
                      : 'text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted/50'
                  }`}
                >
                  {link.label}
                </NavLink>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-border dark:border-border bg-card dark:bg-background pt-10 pb-10 px-4 sm:px-8 mt-16 overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-8 pb-8 border-b border-border dark:border-border">
            {/* Community Unity Vector Illustration */}
            <div className="w-full sm:w-80 md:w-96 lg:w-80 shrink-0 self-center lg:self-end relative group">
              <div
                className="absolute inset-0 -bottom-2 bg-gradient-to-t from-amber-500/10 via-amber-500/5 to-transparent rounded-full blur-xl pointer-events-none -z-10"
                aria-hidden="true"
              />
              <CommunityUnityIllustration className="w-full h-auto drop-shadow-sm transition-transform hover:scale-[1.015] duration-500 motion-reduce:transform-none" />
            </div>

            {/* Municipality & System Attribution */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 flex-1 w-full">
              <div className="space-y-1.5 max-w-xl">
                <div className="text-sm font-semibold text-foreground dark:text-foreground">
                  Municipality of Talibon, Bohol
                </div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed">
                  Talibon Analytics for Gender and Development (TAGAD) is the public monitoring portal of the municipal Gender and Development Focal Point System, established in compliance with Republic Act No. 9710.
                </p>
              </div>

              <div className="text-xs text-muted-foreground dark:text-muted-foreground space-y-0.5 md:text-right shrink-0">
                <div className="font-medium text-foreground dark:text-foreground">Talibon Municipal Hall</div>
                <div>Poblacion, Talibon, Bohol 6325</div>
                <div>gad.talibon@gmail.com</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground dark:text-muted-foreground">
            <div>
              © {new Date().getFullYear()} Municipal Government of Talibon. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Link to="/demographics" className="hover:text-foreground dark:hover:text-white transition-colors">
                Demographics
              </Link>
              <Link to="/public-programs" className="hover:text-foreground dark:hover:text-white transition-colors">
                Programs
              </Link>
              <Link to="/public-accomplishments" className="hover:text-foreground dark:hover:text-white transition-colors">
                Accomplishments
              </Link>
              <Link to="/feedback" className="hover:text-foreground dark:hover:text-white transition-colors">
                Feedback
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

