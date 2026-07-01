import React, { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  loadTime: number | null;
  domContentLoaded: number | null;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
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

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      setMetrics(prev => ({
        ...prev,
        ttfb: navigation.responseStart,
        loadTime: navigation.loadEventEnd - navigation.startTime,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
      }));
    }

    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        setMetrics(prev => ({
          ...prev,
          fcp: lastEntry.startTime,
        }));
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('FCP observer not supported', e);
    }

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        setMetrics(prev => ({
          ...prev,
          lcp: lastEntry.startTime,
        }));
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
        setMetrics(prev => ({
          ...prev,
          fid: (lastEntry as any).processingStart - lastEntry.startTime,
        }));
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
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        setMetrics(prev => ({
          ...prev,
          cls: clsValue,
        }));
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

  const getStatus = (metric: string, value: number | null) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return '#0cc46c';
      case 'needs-improvement': return '#ffa400';
      case 'poor': return '#ff4e42';
      default: return '#888';
    }
  };

  return (
    <>
      <button
        onClick={() => setShow(!show)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          padding: '10px 20px',
          backgroundColor: '#61dafb',
          color: '#282c34',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: 14,
        }}
      >
        🚀 性能
      </button>

      {show && (
        <div
          style={{
            position: 'fixed',
            bottom: 70,
            right: 20,
            zIndex: 9999,
            backgroundColor: '#fff',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: 20,
            maxWidth: 400,
            fontFamily: 'monospace',
          }}
        >
          <h3 style={{ margin: '0 0 15px 0', color: '#282c34' }}>性能指标</h3>
          
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>FCP (首次内容绘制)</span>
              <span style={{ color: getStatusColor(getStatus('fcp', metrics.fcp)) }}>
                {formatTime(metrics.fcp)}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>LCP (最大内容绘制)</span>
              <span style={{ color: getStatusColor(getStatus('lcp', metrics.lcp)) }}>
                {formatTime(metrics.lcp)}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>FID (首次输入延迟)</span>
              <span style={{ color: getStatusColor(getStatus('fid', metrics.fid)) }}>
                {formatTime(metrics.fid)}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>CLS (累积布局偏移)</span>
              <span style={{ color: getStatusColor(getStatus('cls', metrics.cls)) }}>
                {metrics.cls !== null ? metrics.cls.toFixed(4) : '-'}
              </span>
            </div>
            
            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '5px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>TTFB (首字节时间)</span>
              <span>{formatTime(metrics.ttfb)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>DOM加载完成</span>
              <span>{formatTime(metrics.domContentLoaded)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>页面完全加载</span>
              <span>{formatTime(metrics.loadTime)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
