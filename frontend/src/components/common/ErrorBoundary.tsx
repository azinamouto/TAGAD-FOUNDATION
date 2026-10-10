import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TAGAD Uncaught Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-muted border border-border rounded-2xl p-6 text-center space-y-5 shadow-2xl">
            <div className="inline-flex p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Application Exception</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An unexpected interface error occurred. The application state has been safely isolated.
              </p>
              {this.state.error && (
                <div className="p-3 bg-background/80 rounded-lg text-left text-xs font-mono text-rose-400 overflow-x-auto max-h-32 border border-border">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-indigo-600/25 w-full"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
