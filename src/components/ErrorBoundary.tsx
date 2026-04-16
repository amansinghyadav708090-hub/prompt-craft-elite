import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred within the synthesis engine.";
      let isFirebaseError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            isFirebaseError = true;
            errorMessage = `Security Protocol Violation: ${parsed.error} during ${parsed.operationType} operation.`;
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-950 border border-red-900/30 rounded-2xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 flex items-center justify-center rounded-full mx-auto">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white uppercase tracking-tighter">System Error Detected</h2>
              <p className="text-zinc-500 font-mono text-[10px] leading-relaxed uppercase tracking-widest">
                {errorMessage}
              </p>
            </div>

            {isFirebaseError && (
              <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-left">
                <p className="text-[8px] font-mono text-zinc-600 uppercase mb-1">Diagnostic Code:</p>
                <code className="text-[9px] text-red-400 font-mono break-all">
                  {this.state.error?.message}
                </code>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 font-mono text-xs uppercase tracking-widest transition-all"
            >
              <RefreshCcw size={14} />
              Reboot Systems
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
