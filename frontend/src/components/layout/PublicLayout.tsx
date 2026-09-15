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
    { label: 'Statistical Catalog', to: '/statistical-catalog' },
    { label: 'Programs', to: '/public-programs' },
    { label: 'Accomplishments', to: '/public-accomplishments' },
    { label: 'Approved Plans', to: '/public-plans' },
    { label: 'Feedback', to: '/feedback' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-slate-800 selection:text-white">
      {/* Institutional Top Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm sticky top-0 z-40 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto h-16 flex items-center justify-between gap-6">
          {/* Brand Identity */}
          <Link
            to="/"
            className="flex items-center gap-3 shrink-0"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="text-left">
              <span className="font-semibold text-slate-900 dark:text-white tracking-tight text-base block leading-none">
                TAGAD
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1 leading-none">
                Municipality of Talibon
              </span>
            </div>
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
                      ? 'text-slate-950 dark:text-white font-semibold border-b-2 border-slate-900 dark:border-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
              className="py-1.5 px-3.5 text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 rounded transition-colors whitespace-nowrap"
            >
              Personnel Portal
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 text-xs font-medium rounded transition-colors ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
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
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pt-10 pb-10 px-4 sm:px-8 mt-16 overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-8 pb-8 border-b border-slate-100 dark:border-slate-800">
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
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Municipality of Talibon, Bohol
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Talibon Analytics for Gender and Development (TAGAD) is the public monitoring portal of the municipal Gender and Development Focal Point System, established in compliance with Republic Act No. 9710.
                </p>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 md:text-right shrink-0">
                <div className="font-medium text-slate-700 dark:text-slate-300">Talibon Municipal Hall</div>
                <div>Poblacion, Talibon, Bohol 6325</div>
                <div>gad.talibon@gmail.com</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div>
              © {new Date().getFullYear()} Municipal Government of Talibon. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Link to="/demographics" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Demographics
              </Link>
              <Link to="/public-programs" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Programs
              </Link>
              <Link to="/public-accomplishments" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Accomplishments
              </Link>
              <Link to="/feedback" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Feedback
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

