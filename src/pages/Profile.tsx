import React, { useState } from 'react';
import { useAppStore } from '../store';
import ConfirmationModal from '../components/ConfirmationModal';
import UserProfileEditor from '../components/UserProfileEditor';
import PasswordChangeForm from '../components/PasswordChangeForm';
import LoginHistoryPanel from '../components/LoginHistoryPanel';
import SecuritySettingsPanel from '../components/SecuritySettingsPanel';

type TabType = 'profile' | 'password' | 'history' | 'security';

const Profile: React.FC = () => {
  const { user, logout } = useAppStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const tabs = [
    { id: 'profile' as TabType, label: '👤 个人资料', icon: '👤' },
    { id: 'password' as TabType, label: '🔐 修改密码', icon: '🔐' },
    { id: 'history' as TabType, label: '📜 登录历史', icon: '📜' },
    { id: 'security' as TabType, label: '🛡️ 安全设置', icon: '🛡️' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <UserProfileEditor />;
      case 'password':
        return <PasswordChangeForm />;
      case 'history':
        return <LoginHistoryPanel />;
      case 'security':
        return <SecuritySettingsPanel />;
      default:
        return <UserProfileEditor />;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.userInfo}>
            <div style={styles.avatarPlaceholder}>
              <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
            <div style={styles.userDetails}>
              <h1 style={styles.userName}>{user?.username || '用户'}</h1>
              <p style={styles.userRole}>{user?.role || '普通用户'}</p>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button
              style={styles.logoutBtn}
              onClick={() => setShowLogoutConfirm(true)}
            >
              🚪 退出登录
            </button>
          </div>
        </div>
      </div>

      <div style={styles.tabsContainer}>
        <div style={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : {}),
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={styles.tabIcon}>{tab.icon}</span>
              <span style={styles.tabLabel}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.content}>
        {renderContent()}
      </div>

      <div style={styles.dangerSection}>
        <h3 style={styles.dangerTitle}>⚠️ 危险操作</h3>
        <div style={styles.dangerActions}>
          <button
            style={styles.dangerBtn}
            onClick={() => {
              alert('账户注销功能开发中');
            }}
          >
            🗑️ 注销账户
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="退出登录"
        message="确定要退出当前登录吗？"
        confirmText="退出登录"
        cancelText="取消"
        type="warning"
      />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    marginBottom: '20px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatarPlaceholder: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    margin: '0 0 4px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  userRole: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  logoutBtn: {
    padding: '10px 16px',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabsContainer: {
    marginBottom: '20px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    backgroundColor: 'white',
    padding: '8px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    flexWrap: 'wrap',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 20px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
    fontWeight: '500',
  },
  tabIcon: {
    fontSize: '16px',
  },
  tabLabel: {
    whiteSpace: 'nowrap',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  dangerSection: {
    marginTop: '20px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '12px',
    padding: '20px',
  },
  dangerTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#92400e',
  },
  dangerActions: {
    display: 'flex',
    gap: '12px',
  },
  dangerBtn: {
    padding: '12px 24px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

export default Profile;
