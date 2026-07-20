import React, { useState, useEffect, useCallback } from 'react';
import { DatePicker } from './ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/shadcn/Dialog';
import { Button } from './ui/shadcn/Button';
import { Input } from './ui/shadcn/Input';
import { Label } from './ui/shadcn/Label';
import { Badge } from './ui/shadcn/Badge';
import { Card, CardContent, CardFooter, CardHeader } from './ui/shadcn/Card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/shadcn/Select';
import { ScrollArea } from './ui/shadcn/ScrollArea';
import { Separator } from './ui/shadcn/Separator';
import { useToast } from './Toast';

interface Schedule {
  id: number;
  url: string;
  filename: string;
  schedule_type: 'once' | 'daily' | 'weekly' | 'monthly';
  schedule_time: string;
  schedule_day: string;
  schedule_date: string;
  priority: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
  last_run_at: string;
  next_run_at: string;
  total_runs: number;
  created_at: string;
}

interface ScheduleLog {
  id: number;
  schedule_id: number;
  status: 'success' | 'failed';
  error_message: string | null;
  executed_at: string;
  created_at: string;
}

interface ScheduleManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

const ScheduleManager: React.FC<ScheduleManagerProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<{
    url: string;
    filename: string;
    schedule_type: 'once' | 'daily' | 'weekly' | 'monthly';
    schedule_time: string;
    schedule_day: string;
    schedule_date: string;
    priority: number;
  }>({
    url: '',
    filename: '',
    schedule_type: 'once',
    schedule_time: '12:00',
    schedule_day: 'monday',
    schedule_date: '',
    priority: 5
  });
  const [logs, setLogs] = useState<ScheduleLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [currentScheduleId, setCurrentScheduleId] = useState<number | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editFormData, setEditFormData] = useState<typeof formData>(formData);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json() as ApiResponse<Schedule[]>;
      if (data.success && data.data) {
        setSchedules(data.data);
      }
    } catch (error) {
      console.error('获取下载计划失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchSchedules();
    }
  }, [isOpen, fetchSchedules]);

  const createSchedule = async () => {
    if (!formData.url) {
      showToast('请输入下载链接', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json() as ApiResponse<unknown>;
      if (data.success) {
        setShowCreate(false);
        setFormData({
          url: '',
          filename: '',
          schedule_type: 'once',
          schedule_time: '12:00',
          schedule_day: 'monday',
          schedule_date: '',
          priority: 5
        });
        void fetchSchedules();
        showToast('下载计划创建成功', 'success');
      } else {
        showToast(data.message || '创建失败', 'error');
      }
    } catch (error) {
      console.error('创建下载计划失败:', error);
      showToast('创建失败', 'error');
    }
  };

  const toggleSchedule = async (id: number, action: 'pause' | 'resume') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/schedules/${id}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json() as ApiResponse<unknown>;
      if (data.success) {
        void fetchSchedules();
        showToast(action === 'pause' ? '已暂停下载计划' : '已启用下载计划', 'success');
      } else {
        showToast(data.message || '操作失败', 'error');
      }
    } catch (error) {
      console.error('切换下载计划状态失败:', error);
      showToast('操作失败', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmId === null) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/schedules/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json() as ApiResponse<unknown>;
      if (data.success) {
        void fetchSchedules();
        showToast('下载计划已删除', 'success');
      } else {
        showToast(data.message || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除下载计划失败:', error);
      showToast('删除失败', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const fetchScheduleLogs = async (scheduleId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/schedules/${scheduleId}/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json() as ApiResponse<ScheduleLog[]>;
      if (data.success && data.data) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error('获取调度日志失败:', error);
    }
  };

  const openLogs = (scheduleId: number) => {
    setCurrentScheduleId(scheduleId);
    setShowLogs(true);
    void fetchScheduleLogs(scheduleId);
  };

  const startEdit = (schedule: Schedule) => {
    setCurrentScheduleId(schedule.id);
    setEditFormData({
      url: schedule.url,
      filename: schedule.filename || '',
      schedule_type: schedule.schedule_type,
      schedule_time: schedule.schedule_time,
      schedule_day: schedule.schedule_day,
      schedule_date: schedule.schedule_date,
      priority: schedule.priority
    });
    setShowEdit(true);
  };

  const updateSchedule = async () => {
    if (currentScheduleId === null) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/schedules/${currentScheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });

      const data = await response.json() as ApiResponse<unknown>;
      if (data.success) {
        setShowEdit(false);
        void fetchSchedules();
        showToast('下载计划已更新', 'success');
      } else {
        showToast(data.message || '更新失败', 'error');
      }
    } catch (error) {
      console.error('更新下载计划失败:', error);
      showToast('更新失败', 'error');
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const getScheduleTypeText = (type: string) => {
    switch (type) {
      case 'once': return '一次性';
      case 'daily': return '每日';
      case 'weekly': return '每周';
      case 'monthly': return '每月';
      default: return type;
    }
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'default' | 'error' => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'default';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '✓ 启用';
      case 'paused': return '⏸ 暂停';
      case 'completed': return '✓ 完成';
      case 'failed': return '✗ 失败';
      default: return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold text-gray-900">⏰ 下载计划管理</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex gap-3 px-6 py-4 border-b border-gray-200">
          <Button onClick={() => setShowCreate(true)}>
            ➕ 创建新计划
          </Button>
          <Button
            variant="outline"
            onClick={() => void fetchSchedules()}
            disabled={loading}
          >
            🔄 刷新
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {loading ? (
              <div className="text-center py-16 text-gray-500">加载中...</div>
            ) : schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="text-6xl mb-4">📅</span>
                <p className="mb-4">暂无下载计划</p>
                <Button onClick={() => setShowCreate(true)}>
                  创建第一个下载计划
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {schedules.map((schedule) => (
                  <Card key={schedule.id} className="bg-gray-50 border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm text-gray-900 font-medium truncate"
                            title={schedule.url}
                          >
                            🔗 {schedule.url.substring(0, 50)}...
                          </div>
                          {schedule.filename && (
                            <div className="text-sm text-gray-500 mt-1">
                              📄 {schedule.filename}
                            </div>
                          )}
                        </div>
                        <Badge variant={getStatusBadgeVariant(schedule.status)} className="flex-shrink-0">
                          {getStatusText(schedule.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-500">
                        <div>
                          <span className="font-semibold text-gray-700">类型：</span>
                          <span>{getScheduleTypeText(schedule.schedule_type)}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">时间：</span>
                          <span>{schedule.schedule_time}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">下次执行：</span>
                          <span>{formatDateTime(schedule.next_run_at)}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">已执行：</span>
                          <span>{schedule.total_runs} 次</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void openLogs(schedule.id)}
                        >
                          📋 日志
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(schedule)}
                        >
                          ✏️ 编辑
                        </Button>
                        {schedule.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                            onClick={() => void toggleSchedule(schedule.id, 'pause')}
                          >
                            ⏸ 暂停
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => void toggleSchedule(schedule.id, 'resume')}
                          >
                            ▶ 启用
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteConfirmId(schedule.id)}
                        >
                          🗑 删除
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {deleteConfirmId !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirmId(null)}>
            <div className="bg-white rounded-xl p-6 max-w-sm w-[90%] shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-sm text-gray-500 mb-5">确定要删除这个下载计划吗？此操作不可撤销。</p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void handleConfirmDelete()}
                  disabled={isDeleting}
                >
                  {isDeleting ? '删除中...' : '确认删除'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {showCreate && (
          <>
            <Separator />
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-5">创建下载计划</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">下载链接 *</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="输入下载链接"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filename">文件名（可选）</Label>
                  <Input
                    id="filename"
                    type="text"
                    value={formData.filename}
                    onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
                    placeholder="自定义文件名"
                  />
                </div>

                <div className="space-y-2">
                  <Label>执行类型 *</Label>
                  <Select
                    value={formData.schedule_type}
                    onValueChange={(value) => setFormData({ ...formData, schedule_type: value as Schedule['schedule_type'] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择执行类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">一次性</SelectItem>
                      <SelectItem value="daily">每日</SelectItem>
                      <SelectItem value="weekly">每周</SelectItem>
                      <SelectItem value="monthly">每月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule_time">执行时间 *</Label>
                  <Input
                    id="schedule_time"
                    type="time"
                    value={formData.schedule_time}
                    onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                  />
                </div>

                {formData.schedule_type === 'weekly' && (
                  <div className="space-y-2">
                    <Label>星期</Label>
                    <Select
                      value={formData.schedule_day}
                      onValueChange={(value) => setFormData({ ...formData, schedule_day: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择星期" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">星期一</SelectItem>
                        <SelectItem value="tuesday">星期二</SelectItem>
                        <SelectItem value="wednesday">星期三</SelectItem>
                        <SelectItem value="thursday">星期四</SelectItem>
                        <SelectItem value="friday">星期五</SelectItem>
                        <SelectItem value="saturday">星期六</SelectItem>
                        <SelectItem value="sunday">星期日</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.schedule_type === 'monthly' && (
                  <div className="space-y-2">
                    <Label>每月日期</Label>
                    <DatePicker
                      value={formData.schedule_date ? new Date(formData.schedule_date) : undefined}
                      onChange={(date) => setFormData({ ...formData, schedule_date: date.toISOString().split('T')[0] })}
                      placeholder="选择日期"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreate(false)}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={() => void createSchedule()}
                  >
                    创建计划
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {showLogs && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLogs(false)}>
            <div className="bg-white rounded-xl p-6 max-w-lg w-[90%] shadow-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">📋 执行日志</h3>
                <Button variant="outline" size="sm" onClick={() => setShowLogs(false)}>✕</Button>
              </div>
              <ScrollArea className="flex-1">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">暂无执行日志</div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-sm font-medium ${log.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {log.status === 'success' ? '✅ 成功' : '❌ 失败'}
                          </span>
                          <span className="text-xs text-gray-400">{formatDateTime(log.executed_at)}</span>
                        </div>
                        {log.error_message && (
                          <p className="text-sm text-gray-500 break-all">
                            {log.error_message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}

        {showEdit && (
          <>
            <Separator />
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-5">✏️ 编辑下载计划</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_url">下载链接 *</Label>
                  <Input
                    id="edit_url"
                    type="url"
                    value={editFormData.url}
                    onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                    placeholder="输入下载链接"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_filename">文件名（可选）</Label>
                  <Input
                    id="edit_filename"
                    type="text"
                    value={editFormData.filename}
                    onChange={(e) => setEditFormData({ ...editFormData, filename: e.target.value })}
                    placeholder="自定义文件名"
                  />
                </div>

                <div className="space-y-2">
                  <Label>执行类型 *</Label>
                  <Select
                    value={editFormData.schedule_type}
                    onValueChange={(value) => setEditFormData({ ...editFormData, schedule_type: value as Schedule['schedule_type'] })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择执行类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">一次性</SelectItem>
                      <SelectItem value="daily">每日</SelectItem>
                      <SelectItem value="weekly">每周</SelectItem>
                      <SelectItem value="monthly">每月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_schedule_time">执行时间 *</Label>
                  <Input
                    id="edit_schedule_time"
                    type="time"
                    value={editFormData.schedule_time}
                    onChange={(e) => setEditFormData({ ...editFormData, schedule_time: e.target.value })}
                  />
                </div>

                {editFormData.schedule_type === 'weekly' && (
                  <div className="space-y-2">
                    <Label>星期</Label>
                    <Select
                      value={editFormData.schedule_day}
                      onValueChange={(value) => setEditFormData({ ...editFormData, schedule_day: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择星期" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">星期一</SelectItem>
                        <SelectItem value="tuesday">星期二</SelectItem>
                        <SelectItem value="wednesday">星期三</SelectItem>
                        <SelectItem value="thursday">星期四</SelectItem>
                        <SelectItem value="friday">星期五</SelectItem>
                        <SelectItem value="saturday">星期六</SelectItem>
                        <SelectItem value="sunday">星期日</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {editFormData.schedule_type === 'monthly' && (
                  <div className="space-y-2">
                    <Label>每月日期</Label>
                    <DatePicker
                      value={editFormData.schedule_date ? new Date(editFormData.schedule_date) : undefined}
                      onChange={(date) => setEditFormData({ ...editFormData, schedule_date: date.toISOString().split('T')[0] })}
                      placeholder="选择日期"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowEdit(false)}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={() => void updateSchedule()}
                  >
                    保存更改
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleManager;
