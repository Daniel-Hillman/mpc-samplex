import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
          <AlertTriangle size={40} style={{ color: 'var(--color-danger)' }} />
          <div>
            <h2 className="font-mono text-lg font-semibold">Something broke on this page</h2>
            <p className="mt-1 max-w-md text-sm text-text-secondary">
              {String(this.state.error?.message || this.state.error)}
            </p>
          </div>
          <button type="button" className="btn" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
