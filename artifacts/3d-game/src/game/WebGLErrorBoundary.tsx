import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[WebGLErrorBoundary] Caught error:', error.message, info);
  }

  render() {
    if (this.state.hasError) {
      const isWebGL = this.state.errorMessage.toLowerCase().includes('webgl') ||
                      this.state.errorMessage.toLowerCase().includes('context');
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#0d1117',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e8eaf6',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            padding: '2rem',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {isWebGL ? 'WebGL Not Supported' : 'Game Error'}
          </h2>
          <p style={{ color: '#6b7280', maxWidth: '400px', lineHeight: 1.6 }}>
            {isWebGL
              ? 'Village Spatial 3D requires WebGL. Please open this game in a modern browser (Chrome, Firefox, Safari, or Edge) on a device with GPU support.'
              : this.state.errorMessage}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
