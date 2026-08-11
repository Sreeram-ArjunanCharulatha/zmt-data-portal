import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * WebGL can fail for reasons outside the app's control (context loss,
 * blocked hardware acceleration). Without a boundary those failures take
 * the whole page down; with one, search and filtering keep working.
 */
export class GlobeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Globe scene failed to render', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          textAlign: 'center',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
      >
        <div>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>
            The 3D globe could not be displayed
          </p>
          <p
            style={{
              fontSize: 12.5,
              color: 'var(--text-secondary)',
              marginBottom: 14,
            }}
          >
            Your browser may have lost its WebGL context. Search, filters and
            the dataset list are still available.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            style={{
              height: 34,
              padding: '0 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
