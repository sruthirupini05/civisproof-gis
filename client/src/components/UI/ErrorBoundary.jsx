import React from 'react';

/**
 * ErrorBoundary — catches any render / lifecycle crash and shows a recovery UI
 * instead of a blank page.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = this.state.error?.message || 'Unknown error';

    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fef3c7',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#92400e', marginBottom: 8 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: '#78350f', marginBottom: 20, maxWidth: 360 }}>
          The page crashed due to an unexpected error. Please go back to the home
          screen and try again.
        </p>
        <details
          style={{
            marginBottom: 24,
            background: '#fffbeb',
            border: '1px solid #f59e0b',
            borderRadius: 8,
            padding: '8px 16px',
            maxWidth: 480,
            width: '100%',
            textAlign: 'left',
            fontSize: 12,
            color: '#92400e',
          }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
            Technical details
          </summary>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 8 }}>
            {msg}
          </pre>
        </details>
        <button
          onClick={this.handleReload}
          style={{
            background: '#991b1b',
            color: '#ffffff',
            border: 'none',
            borderRadius: 24,
            padding: '12px 32px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ↩ Go to Home
        </button>
      </div>
    );
  }
}
