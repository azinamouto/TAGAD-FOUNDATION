import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex p-4 bg-primary/10 text-primary rounded-2xl border border-primary/20 shadow-inner">
          <Compass className="w-12 h-12 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white font-mono">404</h1>
          <h2 className="text-xl font-semibold text-foreground">Page Not Found</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The requested page does not exist in the TAGAD Municipal Portal or may have been relocated.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-indigo-600/25"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-muted hover:bg-background text-foreground font-medium text-sm rounded-lg border border-border transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Public Portal
          </Link>
        </div>
      </div>
    </div>
  );
};
