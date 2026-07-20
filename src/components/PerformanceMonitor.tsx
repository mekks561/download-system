import React, { useState, useEffect, useRef, useReducer } from 'react';
import { Button } from './ui/shadcn/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/shadcn/Card';
import { Badge } from './ui/shadcn/Badge';
import { Separator } from './ui/shadcn/Separator';

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  loadTime: number | null;
  domContentLoaded: number | null;
}

interface PerfEventTiming extends PerformanceEntry {
  processingStart: number;
}

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

interface MetricItemProps {
  label: string;
  value: string;
  status?: string;
}

const MetricItem: React.FC<MetricItemProps> = ({ label, value, status }) => {
  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'secondary' => {
    switch (status) {
      case 'good': return 'success';
      case 'needs-improvement': return 'warning';
      case 'poor': return 'error';
      default: return 'secondary';
    }
  };

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      {status ? (
        <Badge variant={getStatusBadgeVariant(status)}>
          {value}
        </Badge>
      ) : (
        <span className="text-sm font-mono font-medium text-gray-700">{value}</span>
      )}
    </div>
  );
};

type MetricsAction =
  | { type: 'SET_TTFB'; value: number }
  | { type: 'SET_LOAD_TIME'; value: number }
  | { type: 'SET_DOM_LOADED'; value: number }
  | { type: 'SET_FCP'; value: number }
  | { type: 'SET_LCP'; value: number }
  | { type: 'SET_FID'; value: number }
  | { type: 'SET_CLS'; value: number };

const metricsReducer = (state: PerformanceMetrics, action: MetricsAction): PerformanceMetrics => {
  switch (action.type) {
    case 'SET_TTFB':
      return { ...state, ttfb: action.value };
    case 'SET_LOAD_TIME':
      return { ...state, loadTime: action.value };
    case 'SET_DOM_LOADED':
      return { ...state, domContentLoaded: action.value };
    case 'SET_FCP':
      return { ...state, fcp: action.value };
    case 'SET_LCP':
      return { ...state, lcp: action.value };
    case 'SET_FID':
      return { ...state, fid: action.value };
    case 'SET_CLS':
      return { ...state, cls: action.value };
    default:
      return state;
  }
};

export function PerformanceMonitor() {
  const [metrics, dispatchMetrics] = useReducer(metricsReducer, {
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    loadTime: null,
    domContentLoaded: null,
  });
  
  const [show, setShow] = useState(false);
  const observerRef = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return;
    }

    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      dispatchMetrics({ type: 'SET_TTFB', value: navigation.responseStart });
      dispatchMetrics({ type: 'SET_LOAD_TIME', value: navigation.loadEventEnd - navigation.startTime });
      dispatchMetrics({ type: 'SET_DOM_LOADED', value: navigation.domContentLoadedEventEnd - navigation.startTime });
    }

    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        dispatchMetrics({ type: 'SET_FCP', value: lastEntry.startTime });
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('FCP observer not supported', e);
    }

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        dispatchMetrics({ type: 'SET_LCP', value: lastEntry.startTime });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      observerRef.current = lcpObserver;
    } catch (e) {
      console.warn('LCP observer not supported', e);
    }

    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        dispatchMetrics({ type: 'SET_FID', value: (lastEntry as PerfEventTiming).processingStart - lastEntry.startTime });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observer not supported', e);
    }

    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        for (const entry of entries) {
          const layoutEntry = entry as LayoutShiftEntry;
          if (!layoutEntry.hadRecentInput) {
            clsValue += layoutEntry.value;
          }
        }
        dispatchMetrics({ type: 'SET_CLS', value: clsValue });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS observer not supported', e);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const formatTime = (ms: number | null) => {
    if (ms === null) return '-';
    return `${ms.toFixed(2)}ms`;
  };

  const getStatus = (metric: string, value: number | null): 'good' | 'needs-improvement' | 'poor' | 'unknown' => {
    if (value === null) return 'unknown';
    
    const thresholds: Record<string, { good: number; needsImprovement: number }> = {
      fcp: { good: 1800, needsImprovement: 3000 },
      lcp: { good: 2500, needsImprovement: 4000 },
      fid: { good: 100, needsImprovement: 300 },
      cls: { good: 0.1, needsImprovement: 0.25 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  };

  return (
    <>
      <Button
        onClick={() => setShow(!show)}
        className="fixed bottom-5 right-5 z-50 shadow-lg"
        size="sm"
      >
        🚀 性能
      </Button>

      {show && (
        <Card className="fixed bottom-[70px] right-5 z-50 w-96 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">性能指标</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <MetricItem
                label="FCP (首次内容绘制)"
                value={formatTime(metrics.fcp)}
                status={getStatus('fcp', metrics.fcp)}
              />
              
              <MetricItem
                label="LCP (最大内容绘制)"
                value={formatTime(metrics.lcp)}
                status={getStatus('lcp', metrics.lcp)}
              />
              
              <MetricItem
                label="FID (首次输入延迟)"
                value={formatTime(metrics.fid)}
                status={getStatus('fid', metrics.fid)}
              />
              
              <MetricItem
                label="CLS (累积布局偏移)"
                value={metrics.cls !== null ? metrics.cls.toFixed(4) : '-'}
                status={getStatus('cls', metrics.cls)}
              />
              
              <Separator className="my-1" />
              
              <MetricItem
                label="TTFB (首字节时间)"
                value={formatTime(metrics.ttfb)}
              />
              
              <MetricItem
                label="DOM加载完成"
                value={formatTime(metrics.domContentLoaded)}
              />
              
              <MetricItem
                label="页面完全加载"
                value={formatTime(metrics.loadTime)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
