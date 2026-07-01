import React, { useState, useEffect } from 'react';
import GmAuthService from '../services/gmAuthService';
import GmDashboardService from '../services/gmDashboardService';

const Dashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const authService = GmAuthService.getInstance();
  const dashboardService = GmDashboardService.getInstance();
  const currentUser = authService.getCurrentUser();

  const loadAllData = async () => {
    setLoading(true);
    try {
      const statsData = await dashboardService.getStats();
      if (statsData.success) setStats(statsData.data);

      try {
        const usersData = await dashboardService.getUsers();
        if (usersData.success) setUsers(usersData.data);
      } catch (error) {
        console.error('加载用户数据失败:', error);
      }

      try {
        const downloadsData = await dashboardService.getAllDownloads();
        if (downloadsData.success) setDownloads(downloadsData.data);
      } catch (error) {
        console.error('加载下载数据失败:', error);
      }

      try {
        const uploadsData = await dashboardService.getAllUploads();
        if (uploadsData.success) setUploads(uploadsData.data);
      } catch (error) {
        console.error('加载上传数据失败:', error);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleDeleteUser = async (id) => {
    if (!window.confirm('确定要删除此用户吗？这将同时删除该用户的所有下载和上传记录！')) {
      return;
    }

    try {
      const response = await dashboardService.deleteUser(id);
      if (response.success) {
        setMessage('用户删除成功！');
        setTimeout(() => setMessage(''), 3000);
        await loadAllData();
      } else {
        setMessage(response.message || '删除用户失败');
      }
    } catch (error) {
      setMessage('删除用户时发生错误');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'downloading': case 'uploading': return '#3b82f6';
      case 'pending': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'downloading': return '下载中';
      case 'uploading': return '上传中';
      case 'pending': return '等待中';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'super_admin': return '超级管理员';
      case 'admin': return '管理员';
      case 'moderator': return '版主';
      case 'viewer': return '查看者';
      default: return role;
    }
  };

  if (!initialLoadDone) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>加载GM后台数据中...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>🎛 GM后台管理系统</h1>
          <p style={styles.subtitle}>独立管理面板 - 与主应用完全分离</p>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <span style={styles.userName}>👤 {currentUser?.name || currentUser?.username}</span>
            <span style={styles.userRole}>({getRoleText(currentUser?.role)})</span>
          </div>
          <button style={styles.logoutButton} onClick={onLogout}>
            退出登录
          </button>
        </div>
      </header>

      {message && (
        <div style={styles.message}>
          {message}
        </div>
      )}

      <nav style={styles.nav}>
        <button
          style={{ ...styles.navButton, ...(activeTab === 'stats' ? styles.navButtonActive : {}) }}
          onClick={() => setActiveTab('stats')}
        >
          📊 数据概览
        </button>
        <button
          style={{ ...styles.navButton, ...(activeTab === 'users' ? styles.navButtonActive : {}) }}
          onClick={() => setActiveTab('users')}
        >
          👥 用户管理
        </button>
        <button
          style={{ ...styles.navButton, ...(activeTab === 'downloads' ? styles.navButtonActive : {}) }}
          onClick={() => setActiveTab('downloads')}
        >
          📥 下载记录
        </button>
        <button
          style={{ ...styles.navButton, ...(activeTab === 'uploads' ? styles.navButtonActive : {}) }}
          onClick={() => setActiveTab('uploads')}
        >
          📤 上传记录
        </button>
        <button
          style={styles.refreshButton}
          onClick={loadAllData}
        >
          🔄 刷新
        </button>
      </nav>

      <main style={styles.main}>
        {activeTab === 'stats' && (
          <div>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>👥</div>
                <div style={styles.statValue}>{stats?.userCount || 0}</div>
                <div style={styles.statLabel}>总用户数</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📥</div>
                <div style={styles.statValue}>{stats?.downloadCount || 0}</div>
                <div style={styles.statLabel}>总下载数</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📤</div>
                <div style={styles.statValue}>{stats?.uploadCount || 0}</div>
                <div style={styles.statLabel}>总上传数</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📅</div>
                <div style={styles.statValue}>{(stats?.todayDownloads || 0) + (stats?.todayUploads || 0)}</div>
                <div style={styles.statLabel}>今日任务</div>
              </div>
            </div>

            <div style={styles.statusSummary}>
              <h3 style={styles.sectionTitle}>下载状态分布</h3>
              <div style={styles.statusBars}>
                {stats?.downloadStatusStats && stats.downloadStatusStats.length > 0 ? (
                  stats.downloadStatusStats.map((stat, idx) => (
                    <div key={idx} style={styles.statusBarItem}>
                      <div style={styles.statusBarLabel}>
                        {getStatusText(stat.status)}: {stat.count}
                      </div>
                      <div style={styles.statusBar}>
                        <div
                          style={{
                            ...styles.statusBarFill,
                            width: `${(stat.count / (stats.downloadCount || 1)) * 100}%`,
                            backgroundColor: getStatusColor(stat.status)
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                    暂无数据
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableCell}>ID</th>
                  <th style={styles.tableCell}>用户名</th>
                  <th style={styles.tableCell}>邮箱</th>
                  <th style={styles.tableCell}>下载数</th>
                  <th style={styles.tableCell}>上传数</th>
                  <th style={styles.tableCell}>注册时间</th>
                  <th style={styles.tableCell}>操作</th>
                </tr>
              </thead>
              <tbody>
                {users && users.length > 0 ? users.map((user) => (
                  <tr key={user.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{user.id}</td>
                    <td style={styles.tableCell}>{user.username}</td>
                    <td style={styles.tableCell}>{user.email}</td>
                    <td style={styles.tableCell}>{user.downloadCount}</td>
                    <td style={styles.tableCell}>{user.uploadCount}</td>
                    <td style={styles.tableCell}>{formatDate(user.created_at)}</td>
                    <td style={styles.tableCell}>
                      {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                        <button
                          style={styles.deleteButton}
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          🗑️ 删除
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                      暂无用户数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'downloads' && (
          <div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableCell}>ID</th>
                  <th style={styles.tableCell}>用户</th>
                  <th style={styles.tableCell}>文件名</th>
                  <th style={styles.tableCell}>状态</th>
                  <th style={styles.tableCell}>进度</th>
                  <th style={styles.tableCell}>大小</th>
                  <th style={styles.tableCell}>时间</th>
                </tr>
              </thead>
              <tbody>
                {downloads && downloads.length > 0 ? downloads.map((download) => (
                  <tr key={download.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{download.id}</td>
                    <td style={styles.tableCell}>{download.username || download.email || 'N/A'}</td>
                    <td style={styles.tableCell} title={download.url}>{download.filename}</td>
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.statusTag,
                        backgroundColor: getStatusColor(download.status)
                      }}>
                        {getStatusText(download.status)}
                      </span>
                    </td>
                    <td style={styles.tableCell}>{download.progress.toFixed(1)}%</td>
                    <td style={styles.tableCell}>{formatBytes(download.total_bytes)}</td>
                    <td style={styles.tableCell}>{formatDate(download.created_at)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                      暂无下载记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'uploads' && (
          <div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableCell}>ID</th>
                  <th style={styles.tableCell}>用户</th>
                  <th style={styles.tableCell}>文件名</th>
                  <th style={styles.tableCell}>状态</th>
                  <th style={styles.tableCell}>进度</th>
                  <th style={styles.tableCell}>大小</th>
                  <th style={styles.tableCell}>时间</th>
                </tr>
              </thead>
              <tbody>
                {uploads && uploads.length > 0 ? uploads.map((upload) => (
                  <tr key={upload.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{upload.id}</td>
                    <td style={styles.tableCell}>{upload.username || upload.email || 'N/A'}</td>
                    <td style={styles.tableCell}>{upload.original_filename}</td>
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.statusTag,
                        backgroundColor: getStatusColor(upload.status)
                      }}>
                        {getStatusText(upload.status)}
                      </span>
                    </td>
                    <td style={styles.tableCell}>{upload.progress.toFixed(1)}%</td>
                    <td style={styles.tableCell}>{formatBytes(upload.total_bytes)}</td>
                    <td style={styles.tableCell}>{formatDate(upload.created_at)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                      暂无上传记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  headerLeft: {},
  title: {
    margin: 0,
    color: '#1a1a2e',
    fontSize: '24px'
  },
  subtitle: {
    margin: '5px 0 0 0',
    color: '#666',
    fontSize: '14px'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  userName: {
    fontWeight: '600',
    color: '#333'
  },
  userRole: {
    color: '#666',
    fontSize: '14px'
  },
  logoutButton: {
    padding: '10px 20px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  message: {
    margin: '20px 40px',
    padding: '15px',
    background: '#10b981',
    color: 'white',
    borderRadius: '8px',
    textAlign: 'center'
  },
  nav: {
    display: 'flex',
    padding: '20px 40px',
    gap: '10px',
    flexWrap: 'wrap'
  },
  navButton: {
    padding: '12px 24px',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background 0.2s'
  },
  navButtonActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  refreshButton: {
    padding: '12px 24px',
    background: '#374151',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    marginLeft: 'auto'
  },
  main: {
    padding: '0 40px 40px 40px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'rgba(255,255,255,0.95)',
    padding: '25px',
    borderRadius: '12px',
    textAlign: 'center'
  },
  statIcon: {
    fontSize: '36px',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: '5px'
  },
  statLabel: {
    color: '#666'
  },
  statusSummary: {
    background: 'rgba(255,255,255,0.95)',
    padding: '25px',
    borderRadius: '12px'
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    color: '#1a1a2e'
  },
  statusBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  statusBarItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  statusBarLabel: {
    color: '#333',
    fontWeight: '500'
  },
  statusBar: {
    height: '24px',
    background: '#e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  statusBarFill: {
    height: '100%',
    borderRadius: '12px',
    transition: 'width 0.3s'
  },
  table: {
    width: '100%',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '12px',
    overflow: 'hidden',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    background: '#f3f4f6'
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb'
  },
  tableCell: {
    padding: '15px',
    textAlign: 'left',
    color: '#333'
  },
  statusTag: {
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '500'
  },
  deleteButton: {
    padding: '8px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};

export default Dashboard;
