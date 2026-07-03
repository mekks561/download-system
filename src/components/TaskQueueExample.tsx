import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/shadcn';
import TaskQueue, { Task } from '../components/TaskQueue';

const TaskQueueExample: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      name: 'ubuntu-22.04-desktop-amd64.iso',
      url: 'https://releases.ubuntu.com/22.04/ubuntu-22.04-desktop-amd64.iso',
      status: 'downloading',
      progress: 45.5,
      speed: 5242880,
      size: 4500000000,
      downloaded: 2047500000,
      priority: 8,
      created_at: '2026-05-31T10:00:00Z',
      started_at: '2026-05-31T10:05:00Z',
      retries: 0,
      maxRetries: 3
    },
    {
      id: '2',
      name: 'node-v18.16.0-linux-x64.tar.xz',
      url: 'https://nodejs.org/dist/v18.16.0/node-v18.16.0-linux-x64.tar.xz',
      status: 'pending',
      progress: 0,
      size: 350000000,
      downloaded: 0,
      priority: 6,
      created_at: '2026-05-31T10:02:00Z',
      retries: 0,
      maxRetries: 3
    },
    {
      id: '3',
      name: 'visual-studio-code-linux-x64.tar.gz',
      url: 'https://update.code.visualstudio.com/latest/linux-x64/stable',
      status: 'paused',
      progress: 75.2,
      speed: 0,
      size: 120000000,
      downloaded: 90240000,
      priority: 5,
      created_at: '2026-05-31T10:03:00Z',
      started_at: '2026-05-31T10:08:00Z',
      retries: 0,
      maxRetries: 3
    },
    {
      id: '4',
      name: 'react-native-cli-installer.exe',
      url: 'https://example.com/react-native-cli-installer.exe',
      status: 'failed',
      progress: 30.0,
      size: 85000000,
      downloaded: 25500000,
      priority: 3,
      created_at: '2026-05-31T10:04:00Z',
      error: '网络连接超时',
      retries: 3,
      maxRetries: 3
    },
    {
      id: '5',
      name: 'docker-desktop-installer.exe',
      url: 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe',
      status: 'completed',
      progress: 100,
      size: 520000000,
      downloaded: 520000000,
      priority: 9,
      created_at: '2026-05-31T10:01:00Z',
      started_at: '2026-05-31T10:06:00Z',
      completed_at: '2026-05-31T10:15:00Z',
      retries: 0,
      maxRetries: 3
    }
  ]);

  const handleTaskAction = (taskId: string, action: string) => {
    console.log(`Task ${taskId} action: ${action}`);
    
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      
      switch (action) {
        case 'start':
          return { ...task, status: 'downloading', error: undefined };
        case 'pause':
          return { ...task, status: 'paused' };
        case 'resume':
          return { ...task, status: 'downloading', error: undefined };
        case 'cancel':
        case 'remove':
          return null;
        case 'retry':
          return { ...task, status: 'pending', error: undefined, retries: 0, progress: 0, downloaded: 0 };
        default:
          return task;
      }
    }).filter(Boolean) as Task[]);
  };

  const handleQueueAction = (action: string) => {
    console.log(`Queue action: ${action}`);
    
    switch (action) {
      case 'pauseAll':
        setTasks(prev => prev.map(task => 
          task.status === 'downloading' ? { ...task, status: 'paused' } : task
        ));
        break;
      case 'resumeAll':
        setTasks(prev => prev.map(task => 
          task.status === 'paused' ? { ...task, status: 'downloading' } : task
        ));
        break;
      case 'clearCompleted':
        setTasks(prev => prev.filter(task => task.status !== 'completed'));
        break;
      case 'clearAll':
        setTasks([]);
        break;
    }
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    setTasks(prev => {
      const newTasks = [...prev];
      const [removed] = newTasks.splice(fromIndex, 1);
      newTasks.splice(toIndex, 0, removed);
      return newTasks;
    });
  };

  return (
    <div className="p-10 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          🎯 TaskQueue 组件演示
        </h1>
        
        <TaskQueue
          tasks={tasks}
          onTaskAction={handleTaskAction}
          onQueueAction={handleQueueAction}
          onReorder={handleReorder}
          maxConcurrent={3}
          showControls={true}
          compact={false}
        />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl">📖 使用说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-gray-700">
            <p className="mb-3 font-semibold">功能特性：</p>
            <ul className="mb-4 pl-5 list-disc">
              <li>🎨 可视化任务列表，支持拖拽排序</li>
              <li>⚡ 实时显示下载进度和速度</li>
              <li>🔢 可调节并发下载数量（1-10）</li>
              <li>⏸️ 暂停/继续全部任务</li>
              <li>⭐ 任务优先级调整（1-10级）</li>
              <li>📊 统计数据和预计完成时间</li>
              <li>🗑️ 清除已完成任务</li>
              <li>🔄 重试失败任务</li>
            </ul>

            <p className="mb-3 font-semibold">交互操作：</p>
            <ul className="pl-5 list-disc">
              <li>拖拽 ⋮⋮ 图标可调整任务顺序</li>
              <li>点击 ▶️/⏸️ 按钮控制单个任务</li>
              <li>使用优先级 +/- 按钮调整任务优先级</li>
              <li>并发数滑块控制同时下载的任务数</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaskQueueExample;