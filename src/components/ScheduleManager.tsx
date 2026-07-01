import React, { useState, useEffect } from 'react';
import { DatePicker } from './ui';

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

interface ScheduleManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE = 'http://localhost:5001/api';

const ScheduleManager: React.FC<ScheduleManagerProps> = ({ isOpen, onClose }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
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

  useEffect(() => {
    if (isOpen) {
      fetchSchedules();
    }
  }, [isOpen]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSchedules(data.data);
      }
    } catch (error) {
      console.error('获取下载计划失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async () => {
    if (!formData.url) {
      alert('请输入下载链接');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
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
        fetchSchedules();
      } else {
        alert(data.message || '创建失败');
      }
    } catch (error) {
      console.error('创建下载计划失败:', error);
      alert('创建失败');
    }
  };

  const toggleSchedule = async (id: number, action: 'pause' | 'resume') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/schedules/${id}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      if (data.success) {
        fetchSchedules();
      } else {
        alert(data.message || '操作失败');
      }
    } catch (error) {
      console.error('切换下载计划状态失败:', error);
      alert('操作失败');
    }
  };

  const deleteSchedule = async (id: number) => {
    if (!window.confirm('确定要删除这个下载计划吗？')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/schedules/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchSchedules();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除下载计划失败:', error);
      alert('删除失败');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'paused': return '#f59e0b';
      case 'completed': return '#3b82f6';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>⏰ 下载计划管理</h2>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.toolbar}>
          <button
            style={styles.createButton}
            onClick={() => setShowCreate(true)}
          >
            ➕ 创建新计划
          </button>
          <button
            style={styles.refreshButton}
            onClick={fetchSchedules}
            disabled={loading}
          >
            🔄 刷新
          </button>
        </div>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>加载中...</div>
          ) : schedules.length === 0 ? (
            <div style={styles.empty}>
              <span style={styles.emptyIcon}>📅</span>
              <p>暂无下载计划</p>
              <button
                style={styles.createFirstButton}
                onClick={() => setShowCreate(true)}
              >
                创建第一个下载计划
              </button>
            </div>
          ) : (
            <div style={styles.scheduleList}>
              {schedules.map((schedule) => (
                <div key={schedule.id} style={styles.scheduleCard}>
                  <div style={styles.scheduleHeader}>
                    <div style={styles.scheduleInfo}>
                      <div style={styles.scheduleUrl} title={schedule.url}>
                        🔗 {schedule.url.substring(0, 50)}...
                      </div>
                      {schedule.filename && (
                        <div style={styles.scheduleFilename}>
                          📄 {schedule.filename}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(schedule.status)
                      }}
                    >
                      {schedule.status === 'active' ? '✓ 启用' : 
                       schedule.status === 'paused' ? '⏸ 暂停' :
                       schedule.status === 'completed' ? '✓ 完成' : '✗ 失败'}
                    </span>
                  </div>

                  <div style={styles.scheduleDetails}>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>类型：</span>
                      <span>{getScheduleTypeText(schedule.schedule_type)}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>时间：</span>
                      <span>{schedule.schedule_time}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>下次执行：</span>
                      <span>{formatDateTime(schedule.next_run_at)}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>已执行：</span>
                      <span>{schedule.total_runs} 次</span>
                    </div>
                  </div>

                  <div style={styles.scheduleActions}>
                    {schedule.status === 'active' ? (
                      <button
                        style={styles.pauseButton}
                        onClick={() => toggleSchedule(schedule.id, 'pause')}
                      >
                        ⏸ 暂停
                      </button>
                    ) : (
                      <button
                        style={styles.resumeButton}
                        onClick={() => toggleSchedule(schedule.id, 'resume')}
                      >
                        ▶ 启用
                      </button>
                    )}
                    <button
                      style={styles.deleteButton}
                      onClick={() => deleteSchedule(schedule.id)}
                    >
                      🗑 删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showCreate && (
          <div style={styles.createForm}>
            <h3 style={styles.formTitle}>创建下载计划</h3>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>下载链接 *</label>
              <input
                type="url"
                style={styles.input}
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="输入下载链接"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>文件名（可选）</label>
              <input
                type="text"
                style={styles.input}
                value={formData.filename}
                onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
                placeholder="自定义文件名"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>执行类型 *</label>
              <select
                style={styles.select}
                value={formData.schedule_type}
                onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value as any })}
              >
                <option value="once">一次性</option>
                <option value="daily">每日</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>执行时间 *</label>
              <input
                type="time"
                style={styles.input}
                value={formData.schedule_time}
                onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
              />
            </div>

            {formData.schedule_type === 'weekly' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>星期</label>
                <select
                  style={styles.select}
                  value={formData.schedule_day}
                  onChange={(e) => setFormData({ ...formData, schedule_day: e.target.value })}
                >
                  <option value="monday">星期一</option>
                  <option value="tuesday">星期二</option>
                  <option value="wednesday">星期三</option>
                  <option value="thursday">星期四</option>
                  <option value="friday">星期五</option>
                  <option value="saturday">星期六</option>
                  <option value="sunday">星期日</option>
                </select>
              </div>
            )}

            {formData.schedule_type === 'monthly' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>每月日期</label>
                <DatePicker
                  value={formData.schedule_date ? new Date(formData.schedule_date) : undefined}
                  onChange={(date) => setFormData({ ...formData, schedule_date: date.toISOString().split('T')[0] })}
                  placeholder="选择日期"
                />
              </div>
            )}

            <div style={styles.formActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowCreate(false)}
              >
                取消
              </button>
              <button
                style={styles.submitButton}
                onClick={createSchedule}
              >
                创建计划
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '800px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    backgroundColor: '#fee',
    color: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    fontSize: '24px',
    lineHeight: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  toolbar: {
    display: 'flex',
    gap: '12px',
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  createButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: 'white',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#9ca3af',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  createFirstButton: {
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  scheduleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  scheduleCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e5e7eb',
  },
  scheduleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleUrl: {
    fontSize: '14px',
    color: '#1a1a2e',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  scheduleFilename: {
    fontSize: '13px',
    color: '#6b7280',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '500',
    flexShrink: 0,
  },
  scheduleDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginBottom: '12px',
  },
  detailItem: {
    fontSize: '13px',
    color: '#6b7280',
  },
  detailLabel: {
    fontWeight: '600',
  },
  scheduleActions: {
    display: 'flex',
    gap: '8px',
  },
  pauseButton: {
    padding: '6px 14px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  resumeButton: {
    padding: '6px 14px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 14px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  createForm: {
    padding: '24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  formTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    backgroundColor: 'white',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: 'white',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

export default ScheduleManager;
