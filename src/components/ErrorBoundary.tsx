import React, { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: any[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  resetError: () => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError) {
      if (this.props.resetKeys && prevProps.resetKeys) {
        const keysChanged = this.props.resetKeys.some(
          (key, index) => key !== prevProps.resetKeys?.[index]
        );
        
        if (keysChanged && this.props.onReset) {
          this.handleReset();
        }
      }
    }
  }

  handleReset = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.FallbackComponent) {
        return (
          <this.props.FallbackComponent
            error={this.state.error!}
            errorInfo={this.state.errorInfo!}
            resetError={this.handleReset}
          />
        );
      }

      return <DefaultErrorFallback
        error={this.state.error!}
        errorInfo={this.state.errorInfo!}
        resetError={this.handleReset}
      />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback = React.memo(({ 
  error, 
  errorInfo,
  resetError 
}: ErrorFallbackProps) => {
  const errorDetails = errorInfo?.componentStack || error.stack || '';

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.icon}>💥</div>
        <h1 style={styles.title}>出错了！</h1>
        <p style={styles.message}>
          应用程序遇到了一个意外错误。请尝试刷新页面或重置应用状态。
        </p>
        
        <details style={styles.details}>
          <summary style={styles.summary}>查看错误详情</summary>
          <div style={styles.errorSection}>
            <h4 style={styles.errorTitle}>错误信息：</h4>
            <pre style={styles.errorMessage}>{error.message}</pre>
          </div>
          
          {errorDetails && (
            <div style={styles.errorSection}>
              <h4 style={styles.errorTitle}>堆栈跟踪：</h4>
              <pre style={styles.stackTrace}>{errorDetails}</pre>
            </div>
          )}
        </details>

        <div style={styles.actions}>
          <button style={styles.primaryButton} onClick={() => window.location.reload()}>
            🔄 刷新页面
          </button>
          <button style={styles.secondaryButton} onClick={resetError}>
            ↩️ 重置应用
          </button>
        </div>

        <div style={styles.helpSection}>
          <p style={styles.helpText}>
            如果问题持续存在，请联系技术支持或查看控制台获取更多信息。
          </p>
        </div>
      </div>
    </div>
  );
});

DefaultErrorFallback.displayName = 'DefaultErrorFallback';

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    backgroundColor: '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  content: {
    maxWidth: '700px',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '48px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const,
  },
  icon: {
    fontSize: '80px',
    marginBottom: '24px',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  message: {
    margin: '0 0 32px 0',
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#6b7280',
  },
  details: {
    textAlign: 'left' as const,
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  summary: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#374151',
    cursor: 'pointer',
    padding: '8px 0',
  },
  errorSection: {
    marginTop: '20px',
  },
  errorTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  errorMessage: {
    margin: 0,
    padding: '16px',
    backgroundColor: '#fee',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: '"Courier New", monospace',
    color: '#dc2626',
    overflow: 'auto' as const,
    maxHeight: '200px',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
  },
  stackTrace: {
    margin: 0,
    padding: '16px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '12px',
    fontFamily: '"Courier New", monospace',
    color: '#4b5563',
    overflow: 'auto' as const,
    maxHeight: '300px',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  primaryButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    padding: '12px 24px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  helpSection: {
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  helpText: {
    margin: 0,
    fontSize: '13px',
    color: '#9ca3af',
    lineHeight: '1.5',
  },
};

export default ErrorBoundary;
export { DefaultErrorFallback };
