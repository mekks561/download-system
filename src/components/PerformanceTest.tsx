import React, { useState, useCallback, useRef } from 'react';
import { DownloadItem } from '../types';
import { DownloadService } from '../services/DownloadService';

interface PerformanceTestProps {
  onAddTestItems: (items: DownloadItem[]) => void;
}

const downloadService = DownloadService.getInstance();

const generateMockDownloads = (count: number): DownloadItem[] => {
  const items: DownloadItem[] = [];
  const statuses: DownloadItem['status'][] = ['pending', 'downloading', 'paused', 'completed', 'error'];
  
  for (let i = 0; i < count; i++) {
    items.push({
      id: downloadService.generateId(),
      url: `https://example.com/file${i + 1}.zip`,
      filename: `test_file_${i + 1}.zip`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      progress: Math.floor(Math.random() * 100),
      downloadedBytes: Math.floor(Math.random() * 1024 * 1024 * 100),
      totalBytes: 1024 * 1024 * 100,
      speed: Math.floor(Math.random() * 1024 * 1024),
      resumePosition: 0,
      createdAt: Date.now() - Math.floor(Math.random() * 3600000),
      priority: 'normal',
      error: Math.random() > 0.8 ? '下载失败测试' : undefined,
    });
  }
  
  return items;
};

const PerformanceTest: React.FC<PerformanceTestProps> = ({ onAddTestItems }) => {
  const [count, setCount] = useState(100);
  const [testRunning, setTestRunning] = useState(false);
  const [performanceData, setPerformanceData] = useState<{
    renderTime?: number;
    memoryUsage?: number;
    itemCount?: number;
  }>({});
  const startTimeRef = useRef<number>(0);

  const runPerformanceTest = useCallback(() => {
    setTestRunning(true);
    startTimeRef.current = performance.now();

    const mockItems = generateMockDownloads(count);
    
    const endTime = performance.now();
    const renderTime = endTime - startTimeRef.current;
    
    const memoryUsage = (performance as any).memory?.usedJSHeapSize 
      ? (performance as any).memory.usedJSHeapSize / (1024 * 1024) 
      : undefined;

    setPerformanceData({
      renderTime,
      memoryUsage,
      itemCount: count,
    });

    onAddTestItems(mockItems);
    setTestRunning(false);
  }, [count, onAddTestItems]);

  const addLargeDataset = useCallback(() => {
    const mockItems = generateMockDownloads(1000);
    onAddTestItems(mockItems);
  }, [onAddTestItems]);

  return (
    <div className="performance-test">
      <h3>⚡ 性能测试工具</h3>
      
      <div className="test-controls">
        <div className="input-group">
          <label>测试数量:</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
            min="1"
            max="1000"
          />
        </div>
        
        <button 
          className="test-btn"
          onClick={runPerformanceTest}
          disabled={testRunning}
        >
          {testRunning ? '测试中...' : `添加 ${count} 条测试数据`}
        </button>
        
        <button 
          className="test-btn large"
          onClick={addLargeDataset}
          disabled={testRunning}
        >
          添加 1000 条测试数据（大数据集）
        </button>
      </div>

      {performanceData.renderTime !== undefined && (
        <div className="performance-results">
          <h4>📊 性能测试结果</h4>
          <div className="result-item">
            <span className="result-label">数据量:</span>
            <span className="result-value">{performanceData.itemCount} 条</span>
          </div>
          <div className="result-item">
            <span className="result-label">渲染时间:</span>
            <span className="result-value">{performanceData.renderTime.toFixed(2)} ms</span>
          </div>
          {performanceData.memoryUsage !== undefined && (
            <div className="result-item">
              <span className="result-label">内存使用:</span>
              <span className="result-value">{performanceData.memoryUsage.toFixed(2)} MB</span>
            </div>
          )}
        </div>
      )}

      <div className="test-info">
        <p>💡 提示：虚拟滚动优化后，即使添加1000条数据，也能保持流畅滚动体验。</p>
      </div>
    </div>
  );
};

export default PerformanceTest;