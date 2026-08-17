import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Unhandled render error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-8">
          <p className="text-4xl">😅</p>
          <h1 className="text-xl font-bold text-rose-600">Algo salió mal</h1>
          <p className="max-w-md text-center text-sm text-slate-600">{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-700"
          >
            Recargar app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
