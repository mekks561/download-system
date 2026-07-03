import React, { useState, useCallback, useRef } from 'react';
import { Button } from './ui/shadcn';
import { Card, CardHeader, CardTitle, CardContent } from './ui/shadcn';
import { Badge } from './ui/shadcn';
import { Input } from './ui/shadcn';
import { Label } from './ui/shadcn';
import { DownloadItem } from '../types';
import { DownloadService } from '../services/DownloadService';

interface PerformanceTestProps {
  onAddTestItems: (items: DownloadItem[]) => void;
}

interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
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

    const perfWithMemory = performance as PerformanceWithMemory;
    const memoryUsage = perfWithMemory.memory?.usedJSHeapSize
      ? perfWithMemory.memory.usedJSHeapSize / (1024 * 1024)
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">⚡ 性能测试工具</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Label className="w-20 shrink-0">测试数量:</Label>
            <Input
              type="number"
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max="1000"
              className="w-32"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={runPerformanceTest}
              disabled={testRunning}
              className="flex-1"
            >
              {testRunning ? '测试中...' : `添加 ${count} 条测试数据`}
            </Button>
            
            <Button
              onClick={addLargeDataset}
              disabled={testRunning}
              variant="outline"
              className="flex-1"
            >
              添加 1000 条测试数据（大数据集）
            </Button>
          </div>
        </div>

        {performanceData.renderTime !== undefined && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="mb-3 font-semibold text-gray-900">📊 性能测试结果</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">数据量:</span>
                <Badge variant="secondary">{performanceData.itemCount} 条</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">渲染时间:</span>
                <Badge variant="secondary">{performanceData.renderTime.toFixed(2)} ms</Badge>
              </div>
              {performanceData.memoryUsage !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">内存使用:</span>
                  <Badge variant="secondary">{performanceData.memoryUsage.toFixed(2)} MB</Badge>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">💡 提示：虚拟滚动优化后，即使添加1000条数据，也能保持流畅滚动体验。</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceTest;