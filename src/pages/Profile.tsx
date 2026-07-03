import React, { useState, lazy, Suspense } from 'react';
import { useAppStore } from '../store';
import { AuthService } from '../services/AuthService';
import ConfirmationModal from '../components/ConfirmationModal';

const UserProfileEditor = lazy(() => import('../components/UserProfileEditor'));
const PasswordChangeForm = lazy(() => import('../components/PasswordChangeForm'));
const LoginHistoryPanel = lazy(() => import('../components/LoginHistoryPanel'));
const SecuritySettingsPanel = lazy(() => import('../components/SecuritySettingsPanel'));

type TabType = 'profile' | 'password' | 'history' | 'security';

const Profile: React.FC = () => {
  const { user, logout } = useAppStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('请输入密码以确认注销');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      const authService = AuthService.getInstance();
      const result = await authService.deleteAccount(deletePassword);
      if (result.success) {
        logout();
        window.location.href = '/login';
      } else {
        setDeleteError(result.message || '账户注销失败');
      }
    } catch {
      setDeleteError('网络错误，请稍后重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeletePassword('');
    setDeleteError('');
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
        return (
          <Suspense fallback={<div>加载中...</div>}>
            <UserProfileEditor />
          </Suspense>
        );
      case 'password':
        return (
          <Suspense fallback={<div>加载中...</div>}>
            <PasswordChangeForm />
          </Suspense>
        );
      case 'history':
        return (
          <Suspense fallback={<div>加载中...</div>}>
            <LoginHistoryPanel />
          </Suspense>
        );
      case 'security':
        return (
          <Suspense fallback={<div>加载中...</div>}>
            <SecuritySettingsPanel />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<div>加载中...</div>}>
            <UserProfileEditor />
          </Suspense>
        );
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
            onClick={() => setShowDeleteConfirm(true)}
          >
            🗑️ 注销账户
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div style={styles.modalOverlay} onClick={handleCloseDeleteConfirm}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>🗑️ 注销账户</h3>
              <button style={styles.closeBtn} onClick={handleCloseDeleteConfirm}>✕</button>
            </div>
            <div style={styles.modalContent}>
              <p style={styles.modalWarning}>
                ⚠️ 此操作不可撤销！注销后，您的所有数据将被永久删除，包括下载记录、上传文件和个人信息。
              </p>
              <p style={styles.modalDesc}>请输入密码以确认注销操作：</p>
              <input
                type="password"
                style={styles.modalInput}
                placeholder="请输入密码"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                disabled={isDeleting}
              />
              {deleteError && (
                <p style={styles.modalError}>{deleteError}</p>
              )}
              <div style={styles.modalActions}>
                <button
                  style={styles.modalCancel}
                  onClick={handleCloseDeleteConfirm}
                  disabled={isDeleting}
                >
                  取消
                </button>
                <button
                  style={{
                    ...styles.modalConfirm,
                    ...(isDeleting ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                  }}
                  onClick={() => void handleDeleteAccount()}
                  disabled={isDeleting}
                >
                  {isDeleting ? '注销中...' : '确认注销'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    maxWidth: '440px',
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
  modalWarning: {
    margin: 0,
    padding: '12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#dc2626',
    lineHeight: 1.5,
  },
  modalDesc: {
    margin: 0,
    fontSize: '14px',
    color: '#374151',
  },
  modalInput: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  modalError: {
    margin: 0,
    fontSize: '13px',
    color: '#ef4444',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  modalCancel: {
    flex: 1,
    padding: '10px 20px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  modalConfirm: {
    flex: 1,
    padding: '10px 20px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
  },
};

export default Profile;
