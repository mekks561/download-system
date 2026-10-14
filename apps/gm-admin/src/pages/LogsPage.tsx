import React, { useEffect, useState } from 'react';
import * as gm from '../services/gm';
import { errorText } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button } from '../components/ui';
import SocketService, { SystemLogEvent } from '../services/socketService';

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const fetchLogs = async () => {
    try {
      const data = await gm.getSystemLogs();
      setLogs(data);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // 订阅 Socket.io 实时日志
    const unsubscribe = SocketService.getInstance().onSystemLog((newLog: SystemLogEvent) => {
      if (!isPaused) {
        setLogs(prev => {
          const updated = [newLog, ...prev];
          return updated.slice(0, 500); // 保持最多 500 条
        });
      }
    });

    return () => unsubscribe();
  }, [isPaused]);

  const filteredLogs = logs.filter(log => {
    const matchesLevel = filterLevel ? log.level === filterLevel : true;
    const matchesSearch = searchTerm 
      ? log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.workerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(log.taskId).includes(searchTerm)
      : true;
    return matchesLevel && matchesSearch;
  });

  const stats = {
    total: logs.length,
    error: logs.filter(l => l.level === 'error').length,
    warn: logs.filter(l => l.level === 'warn').length,
  };

  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'info': return <Badge variant="default">INFO</Badge>;
      case 'warn': return <Badge variant="warning">WARN</Badge>;
      case 'error': return <Badge variant="error">ERROR</Badge>;
      default: return <Badge variant="secondary">{level.toUpperCase()}</Badge>;
    }
  };

  if (loading && logs.length === 0) return <p className="text-gray-500">加载中...</p>;
  if (error && logs.length === 0) return <p className="text-error-600">{error}</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">系统日志</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="搜索消息、节点或任务 ID..."
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button 
            variant={isPaused ? 'warning' : 'outline'} 
            size="sm" 
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? '▶️ 继续刷新' : '⏸️ 暂停刷新'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            刷新
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="py-4">
            <p className="text-xs text-blue-600 font-medium">总计日志</p>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="py-4">
            <p className="text-xs text-amber-600 font-medium">警告记录</p>
            <p className="text-2xl font-bold text-amber-900">{stats.warn}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <CardContent className="py-4">
            <p className="text-xs text-red-600 font-medium">错误记录</p>
            <p className="text-2xl font-bold text-red-900">{stats.error}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            实时日志流 (筛选后: {filteredLogs.length} 条)
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant={filterLevel === null ? 'default' : 'outline'} 
              size="xs" 
              className="h-7 text-[10px]"
              onClick={() => setFilterLevel(null)}
            >
              全部
            </Button>
            <Button 
              variant={filterLevel === 'info' ? 'default' : 'outline'} 
              size="xs" 
              className="h-7 text-[10px]"
              onClick={() => setFilterLevel('info')}
            >
              INFO
            </Button>
            <Button 
              variant={filterLevel === 'warn' ? 'default' : 'outline'} 
              size="xs" 
              className="h-7 text-[10px]"
              onClick={() => setFilterLevel('warn')}
            >
              WARN
            </Button>
            <Button 
              variant={filterLevel === 'error' ? 'default' : 'outline'} 
              size="xs" 
              className="h-7 text-[10px]"
              onClick={() => setFilterLevel('error')}
            >
              ERROR
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">时间</TableHead>
                  <TableHead className="w-24">等级</TableHead>
                  <TableHead className="w-32">节点</TableHead>
                  <TableHead className="w-24">任务ID</TableHead>
                  <TableHead>内容</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log, i) => (
                  <TableRow key={i} className="font-mono text-xs">
                    <TableCell className="text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{getLevelBadge(log.level)}</TableCell>
                    <TableCell className="text-gray-700 font-bold">{log.workerId}</TableCell>
                    <TableCell className="text-blue-600">{log.taskId}</TableCell>
                    <TableCell className="text-gray-900 break-all">{log.message}</TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      暂无日志记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogsPage;
