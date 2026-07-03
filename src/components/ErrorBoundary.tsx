import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Button } from './ui/shadcn/Button';
import { Card, CardContent, CardFooter } from './ui/shadcn/Card';

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
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
    if (this.state.hasError && this.state.error) {
      const error = this.state.error;
      const errorInfo = this.state.errorInfo ?? { componentStack: '' };

      if (this.props.FallbackComponent) {
        return (
          <this.props.FallbackComponent
            error={error}
            errorInfo={errorInfo}
            resetError={this.handleReset}
          />
        );
      }

      return <DefaultErrorFallback
        error={error}
        errorInfo={errorInfo}
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
    <div className="min-h-screen flex items-center justify-center p-10 bg-gray-50 font-sans">
      <Card className="max-w-2xl w-full shadow-lg rounded-2xl">
        <CardContent className="p-12 text-center">
          <div className="text-8xl mb-6">💥</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">出错了！</h1>
          <p className="text-base text-gray-500 leading-relaxed mb-8">
            应用程序遇到了一个意外错误。请尝试刷新页面或重置应用状态。
          </p>
          
          <details className="text-left mb-8 p-5 bg-gray-50 rounded-xl border border-gray-200">
            <summary className="text-sm font-semibold text-gray-700 cursor-pointer py-2">
              查看错误详情
            </summary>
            <div className="mt-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">错误信息：</h4>
              <pre className="m-0 p-4 bg-red-50 border border-red-200 rounded-lg text-xs font-mono text-red-600 overflow-auto max-h-52 whitespace-pre-wrap break-all">
                {error.message}
              </pre>
            </div>
            
            {errorDetails && (
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">堆栈跟踪：</h4>
                <pre className="m-0 p-4 bg-gray-100 border border-gray-300 rounded-lg text-xs font-mono text-gray-600 overflow-auto max-h-72 whitespace-pre-wrap break-all">
                  {errorDetails}
                </pre>
              </div>
            )}
          </details>

          <div className="flex gap-3 justify-center mb-6">
            <Button onClick={() => window.location.reload()}>
              🔄 刷新页面
            </Button>
            <Button variant="outline" onClick={resetError}>
              ↩️ 重置应用
            </Button>
          </div>
        </CardContent>
        <CardFooter className="px-12 py-6 border-t border-gray-200 flex justify-center">
          <p className="text-xs text-gray-400 leading-relaxed m-0">
            如果问题持续存在，请联系技术支持或查看控制台获取更多信息。
          </p>
        </CardFooter>
      </Card>
    </div>
  );
});

DefaultErrorFallback.displayName = 'DefaultErrorFallback';

export default ErrorBoundary;
export { DefaultErrorFallback };
