import React, { useState, useEffect } from 'react';

export interface LoginHistoryItem {
  id: string;
  timestamp: number;
  ip: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  isCurrentSession: boolean;
  isSuspicious: boolean;
}

const mockLoginHistory: LoginHistoryItem[] = [
  {
    id: '1',
    timestamp: Date.now(),
    ip: '192.168.1.100',
    device: 'Windows PC',
    browser: 'Chrome',
    os: 'Windows 10',
    location: '北京市',
    isCurrentSession: true,
    isSuspicious: false,
  },
  {
    id: '2',
    timestamp: Date.now() - 86400000,
    ip: '192.168.1.101',
    device: 'iPhone',
    browser: 'Safari',
    os: 'iOS 17',
    location: '北京市',
    isCurrentSession: false,
    isSuspicious: false,
  },
  {
    id: '3',
    timestamp: Date.now() - 172800000,
    ip: '103.234.123.45',
    device: 'Android Phone',
    browser: 'Chrome Mobile',
    os: 'Android 14',
    location: '上海市',
    isCurrentSession: false,
    isSuspicious: true,
  },
  {
    id: '4',
    timestamp: Date.now() - 259200000,
    ip: '192.168.1.102',
    device: 'MacBook Pro',
    browser: 'Safari',
    os: 'macOS Sonoma',
    location: '北京市',
    isCurrentSession: false,
    isSuspicious: false,
  },
  {
    id: '5',
    timestamp: Date.now() - 345600000,
    ip: '203.123.45.67',
    device: 'Windows PC',
    browser: 'Edge',
    os: 'Windows 11',
    location: '广州市',
    isCurrentSession: false,
    isSuspicious: true,
  },
];

interface LoginHistoryPanelProps {
  history?: LoginHistoryItem[];
}

const LoginHistoryPanel: React.FC<LoginHistoryPanelProps> = ({ history }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'current' | 'suspicious'>('all');
  const [selectedItem, setSelectedItem] = useState<LoginHistoryItem | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setLoginHistory(history || mockLoginHistory);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [history]);

  const filteredHistory = loginHistory.filter(item => {
    if (activeFilter === 'current') return item.isCurrentSession;
    if (activeFilter === 'suspicious') return item.isSuspicious;
    return true;
  });

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;

    if (diffMs < 60000) return '刚刚';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}分钟前`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}小时前`;
    if (diffMs < 604800000) return `${Math.floor(diffMs / 86400000)}天前`;

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceIcon = (device: string) => {
    if (device.includes('iPhone')) return '📱';
    if (device.includes('Android')) return '🤖';
    if (device.includes('MacBook')) return '💻';
    if (device.includes('Windows')) return '🖥️';
    if (device.includes('iPad')) return '📲';
    return '🔌';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📜 登录历史</h2>
        <p style={styles.description}>查看您的账户登录记录</p>
      </div>

      <div style={styles.filterBar}>
        <button
          style={{
            ...styles.filterBtn,
            ...(activeFilter === 'all' ? styles.filterBtnActive : {}),
          }}
          onClick={() => setActiveFilter('all')}
        >
          全部 ({loginHistory.length})
        </button>
        <button
          style={{
            ...styles.filterBtn,
            ...(activeFilter === 'current' ? styles.filterBtnActive : {}),
          }}
          onClick={() => setActiveFilter('current')}
        >
          当前会话
        </button>
        <button
          style={{
            ...styles.filterBtn,
            ...(activeFilter === 'suspicious' ? styles.filterBtnActive : {}),
          }}
          onClick={() => setActiveFilter('suspicious')}
        >
          可疑登录 ({loginHistory.filter(h => h.isSuspicious).length})
        </button>
      </div>

      {isLoading ? (
        <div style={styles.loading}>
          <span style={styles.loadingSpinner}>🔄</span>
          <span>加载中...</span>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📭</span>
          <p>暂无登录记录</p>
        </div>
      ) : (
        <div style={styles.historyList}>
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              style={{
                ...styles.historyItem,
                ...(item.isCurrentSession ? styles.currentSession : {}),
                ...(item.isSuspicious ? styles.suspiciousItem : {}),
              }}
              onClick={() => setSelectedItem(item)}
            >
              <div style={styles.historyIcon}>
                <span>{getDeviceIcon(item.device)}</span>
                {item.isCurrentSession && (
                  <span style={styles.currentBadge}>●</span>
                )}
                {item.isSuspicious && (
                  <span style={styles.suspiciousBadge}>⚠️</span>
                )}
              </div>

              <div style={styles.historyContent}>
                <div style={styles.historyHeader}>
                  <span style={styles.deviceName}>{item.device}</span>
                  <span style={styles.loginTime}>{formatTime(item.timestamp)}</span>
                </div>
                <div style={styles.historyDetails}>
                  <span style={styles.detailItem}>🌐 {item.browser} / {item.os}</span>
                  <span style={styles.detailItem}>📍 {item.location}</span>
                </div>
                <div style={styles.ipAddress}>
                  <span style={styles.ipLabel}>IP:</span>
                  <span style={styles.ipValue}>{item.ip}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <div style={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>登录详情</h3>
              <button style={styles.closeBtn} onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>设备</span>
                <span style={styles.detailValue}>{selectedItem.device}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>浏览器</span>
                <span style={styles.detailValue}>{selectedItem.browser}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>操作系统</span>
                <span style={styles.detailValue}>{selectedItem.os}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>IP地址</span>
                <span style={styles.detailValue}>{selectedItem.ip}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>位置</span>
                <span style={styles.detailValue}>{selectedItem.location}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>登录时间</span>
                <span style={styles.detailValue}>
                  {new Date(selectedItem.timestamp).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>状态</span>
                <span style={selectedItem.isCurrentSession ? styles.statusActive : styles.statusInactive}>
                  {selectedItem.isCurrentSession ? '当前会话' : '已退出'}
                </span>
              </div>
              {selectedItem.isSuspicious && (
                <div style={styles.warningBox}>
                  <span>⚠️</span>
                  <span>此登录被标记为可疑，请确保是您本人操作</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '24px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  description: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
  },
  filterBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    justifyContent: 'center',
  },
  filterBtn: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '20px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterBtnActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px',
    color: '#6b7280',
  },
  loadingSpinner: {
    fontSize: '24px',
    marginBottom: '8px',
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px',
    color: '#6b7280',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  historyItem: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid transparent',
  },
  currentSession: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  suspiciousItem: {
    borderColor: '#f97316',
    backgroundColor: '#fffbeb',
  },
  historyIcon: {
    position: 'relative',
    fontSize: '28px',
    padding: '8px',
  },
  currentBadge: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '10px',
    height: '10px',
    backgroundColor: '#22c55e',
    borderRadius: '50%',
  },
  suspiciousBadge: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    fontSize: '14px',
  },
  historyContent: {
    flex: 1,
    minWidth: 0,
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  deviceName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  loginTime: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  historyDetails: {
    display: 'flex',
    gap: '16px',
    marginBottom: '4px',
    flexWrap: 'wrap',
  },
  detailItem: {
    fontSize: '13px',
    color: '#6b7280',
  },
  ipAddress: {
    display: 'flex',
    gap: '4px',
  },
  ipLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  ipValue: {
    fontSize: '12px',
    color: '#374151',
    fontFamily: 'monospace',
  },
  modalOverlay: {
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
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  closeBtn: {
    width: '28px',
    height: '28px',
    backgroundColor: 'white',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  modalContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  detailLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: '14px',
    color: '#1a1a2e',
    fontWeight: '500',
  },
  statusActive: {
    color: '#22c55e',
    backgroundColor: '#dcfce7',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  statusInactive: {
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  warningBox: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#fef3c7',
    color: '#d97706',
    borderRadius: '8px',
    marginTop: '8px',
    fontSize: '13px',
  },
};

export default LoginHistoryPanel;
