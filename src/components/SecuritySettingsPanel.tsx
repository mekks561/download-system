import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './Toast';
import { UserApiService } from '../services/UserApiService';

export interface SecuritySetting {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  type: 'toggle' | 'action' | 'info';
  action?: () => void;
}

export interface Device {
  id: string;
  name: string;
  ip: string;
  location: string;
  lastLogin: number;
  isCurrentDevice: boolean;
}

const mockDevices: Device[] = [
  {
    id: '1',
    name: 'Windows PC',
    ip: '192.168.1.100',
    location: '北京市',
    lastLogin: Date.now(),
    isCurrentDevice: true,
  },
  {
    id: '2',
    name: 'iPhone 14 Pro',
    ip: '192.168.1.101',
    location: '北京市',
    lastLogin: Date.now() - 86400000,
    isCurrentDevice: false,
  },
  {
    id: '3',
    name: 'MacBook Pro',
    ip: '103.234.123.45',
    location: '上海市',
    lastLogin: Date.now() - 172800000,
    isCurrentDevice: false,
  },
];

const SecuritySettingsPanel: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const { showToast } = useToast();

  // 2FA setup state
  const [tfaStep, setTfaStep] = useState<1 | 2 | 3>(1);
  const [tfaPhone, setTfaPhone] = useState('');
  const [tfaCode, setTfaCode] = useState('');
  const [tfaError, setTfaError] = useState('');
  const [tfaLoading, setTfaLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(60);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const reset2FAState = useCallback(() => {
    setTfaStep(1);
    setTfaPhone('');
    setTfaCode('');
    setTfaError('');
    setTfaLoading(false);
    setCountdown(0);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const handleClose2FA = useCallback(() => {
    setShow2FASetup(false);
    reset2FAState();
  }, [reset2FAState]);

  const handleSendCode = useCallback(async () => {
    setTfaError('');
    if (!/^1[3-9]\d{9}$/.test(tfaPhone)) {
      setTfaError('请输入有效的手机号');
      return;
    }
    setTfaLoading(true);
    try {
      const response = await UserApiService.send2FACode(tfaPhone);
      if (response.success) {
        showToast('验证码已发送', 'success');
        startCountdown();
        setTfaStep(2);
      } else {
        setTfaError(response.message || '验证码发送失败');
      }
    } catch {
      setTfaError('网络错误，请稍后重试');
    } finally {
      setTfaLoading(false);
    }
  }, [tfaPhone, showToast, startCountdown]);

  const handleVerifyCode = useCallback(async () => {
    setTfaError('');
    if (!/^\d{6}$/.test(tfaCode)) {
      setTfaError('请输入6位数字验证码');
      return;
    }
    setTfaLoading(true);
    try {
      const response = await UserApiService.verify2FACode(tfaPhone, tfaCode);
      if (response.success) {
        setSettings(prev =>
          prev.map(s =>
            s.id === '2fa' ? { ...s, enabled: true, type: 'action' as const } : s
          )
        );
        setTfaStep(3);
        showToast('两步验证已启用', 'success');
      } else {
        setTfaError(response.message || '验证码错误');
      }
    } catch {
      setTfaError('网络错误，请稍后重试');
    } finally {
      setTfaLoading(false);
    }
  }, [tfaCode, tfaPhone, showToast]);

  const handleDisable2FA = useCallback(async () => {
    setTfaLoading(true);
    setTfaError('');
    try {
      const response = await UserApiService.disable2FA();
      if (response.success) {
        setSettings(prev =>
          prev.map(s => (s.id === '2fa' ? { ...s, enabled: false } : s))
        );
        showToast('两步验证已关闭', 'success');
      } else {
        showToast(response.message || '关闭失败', 'error');
      }
    } catch {
      showToast('网络错误，请稍后重试', 'error');
    } finally {
      setTfaLoading(false);
    }
  }, [showToast]);

  const [settings, setSettings] = useState<SecuritySetting[]>([
    {
      id: 'login-notification',
      name: '登录通知',
      description: '登录时发送通知提醒',
      icon: '🔔',
      enabled: true,
      type: 'toggle',
    },
    {
      id: 'email-notification',
      name: '邮箱通知',
      description: '重要账户操作发送邮件提醒',
      icon: '📧',
      enabled: true,
      type: 'toggle',
    },
    {
      id: '2fa',
      name: '两步验证',
      description: '登录时需要输入验证码',
      icon: '🔐',
      enabled: false,
      type: 'action',
      action: () => setShow2FASetup(true),
    },
    {
      id: 'suspicious-detection',
      name: '异常检测',
      description: '检测并阻止异常登录行为',
      icon: '🛡️',
      enabled: true,
      type: 'toggle',
    },
  ]);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setDevices(mockDevices);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const toggleSetting = (id: string) => {
    setSettings(prev =>
      prev.map(setting =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
    const setting = settings.find(s => s.id === id);
    if (setting) {
      showToast(
        `${setting.name}已${setting.enabled ? '关闭' : '开启'}`,
        'success'
      );
    }
  };

  const getSecurityLevel = (): { level: number; label: string; color: string } => {
    const enabledCount = settings.filter(s => s.enabled).length;
    if (enabledCount >= 4) return { level: 4, label: '极高', color: '#22c55e' };
    if (enabledCount >= 3) return { level: 3, label: '高', color: '#3b82f6' };
    if (enabledCount >= 2) return { level: 2, label: '中', color: '#eab308' };
    if (enabledCount >= 1) return { level: 1, label: '低', color: '#f97316' };
    return { level: 0, label: '极低', color: '#ef4444' };
  };

  const securityLevel = getSecurityLevel();

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLogoutOtherDevices = () => {
    setDevices(prev => prev.filter(d => d.isCurrentDevice));
    showToast('其他设备已退出登录', 'success');
  };

  const handleRemoveDevice = (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    showToast('设备已移除', 'success');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🛡️ 安全设置</h2>
        <p style={styles.description}>保护您的账户安全</p>
      </div>

      <div style={styles.securityLevelCard}>
        <div style={styles.securityLevelHeader}>
          <span style={styles.securityLevelIcon}>🔒</span>
          <div style={styles.securityLevelInfo}>
            <span style={styles.securityLevelLabel}>安全等级</span>
            <span style={{ ...styles.securityLevelValue, color: securityLevel.color }}>
              {securityLevel.label}
            </span>
          </div>
        </div>
        <div style={styles.securityLevelBarContainer}>
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              style={{
                ...styles.securityLevelBarSegment,
                backgroundColor: level <= securityLevel.level ? securityLevel.color : '#e5e7eb',
              }}
            />
          ))}
        </div>
        <p style={styles.securityLevelTip}>
          {securityLevel.level >= 3 ? '您的账户安全保护良好' : '建议开启更多安全功能'}
        </p>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📋 安全选项</h3>
        <div style={styles.settingsList}>
          {settings.map((setting) => (
            <div key={setting.id} style={styles.settingItem}>
              <div style={styles.settingInfo}>
                <span style={styles.settingIcon}>{setting.icon}</span>
                <div style={styles.settingDetails}>
                  <span style={styles.settingName}>{setting.name}</span>
                  <span style={styles.settingDescription}>{setting.description}</span>
                </div>
              </div>
              {setting.type === 'toggle' ? (
                <button
                  style={{
                    ...styles.toggleBtn,
                    ...(setting.enabled ? styles.toggleBtnActive : {}),
                  }}
                  onClick={() => toggleSetting(setting.id)}
                >
                  <span style={styles.toggleKnob} />
                </button>
              ) : setting.type === 'action' ? (
                <button
                  style={{
                    ...styles.actionBtn,
                    ...(setting.enabled ? styles.actionBtnActive : {}),
                  }}
                  disabled={setting.id === '2fa' && tfaLoading}
                  onClick={() => {
                    if (setting.id === '2fa') {
                      if (setting.enabled) {
                        void handleDisable2FA();
                      } else {
                        setShow2FASetup(true);
                      }
                    } else if (setting.action) {
                      setting.action();
                    }
                  }}
                >
                  {setting.id === '2fa' && tfaLoading
                    ? '处理中...'
                    : setting.enabled
                      ? '已启用'
                      : '启用'}
                </button>
              ) : (
                <span style={styles.infoBadge}>📌</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>📱 登录设备</h3>
          {devices.length > 1 && (
            <button
              style={styles.sectionActionBtn}
              onClick={handleLogoutOtherDevices}
            >
              退出其他设备
            </button>
          )}
        </div>
        {isLoading ? (
          <div style={styles.loading}>
            <span style={styles.loadingSpinner}>🔄</span>
            <span>加载中...</span>
          </div>
        ) : devices.length === 0 ? (
          <div style={styles.emptyState}>
            <span>📭</span>
            <p>暂无登录设备</p>
          </div>
        ) : (
          <div style={styles.devicesList}>
            {devices.map((device) => (
              <div
                key={device.id}
                style={{
                  ...styles.deviceItem,
                  ...(device.isCurrentDevice ? styles.currentDevice : {}),
                }}
                onClick={() => {
                  setSelectedDevice(device);
                  setShowDeviceModal(true);
                }}
              >
                <div style={styles.deviceIcon}>
                  <span>{device.isCurrentDevice ? '💻' : '📱'}</span>
                  {device.isCurrentDevice && (
                    <span style={styles.currentDeviceBadge}>当前</span>
                  )}
                </div>
                <div style={styles.deviceInfo}>
                  <span style={styles.deviceName}>{device.name}</span>
                  <span style={styles.deviceLocation}>{device.location}</span>
                </div>
                <div style={styles.deviceDetails}>
                  <span style={styles.deviceIP}>{device.ip}</span>
                  <span style={styles.deviceTime}>{formatTime(device.lastLogin)}</span>
                </div>
                {!device.isCurrentDevice && (
                  <button
                    style={styles.removeDeviceBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveDevice(device.id);
                    }}
                  >
                    移除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {show2FASetup && (
        <div style={styles.modalOverlay} onClick={handleClose2FA}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>🔐 两步验证设置</h3>
              <button style={styles.closeBtn} onClick={handleClose2FA}>✕</button>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.tfaSteps}>
                <div style={{ ...styles.tfaStep, ...(tfaStep >= 1 ? styles.tfaStepActive : {}) }}>
                  <span style={{ ...styles.stepNumber, ...(tfaStep >= 1 ? styles.stepNumberActive : {}) }}>1</span>
                  <span>绑定手机号</span>
                </div>
                <div style={{ ...styles.tfaStep, ...(tfaStep >= 2 ? styles.tfaStepActive : {}) }}>
                  <span style={{ ...styles.stepNumber, ...(tfaStep >= 2 ? styles.stepNumberActive : {}) }}>2</span>
                  <span>验证身份</span>
                </div>
                <div style={{ ...styles.tfaStep, ...(tfaStep >= 3 ? styles.tfaStepActive : {}) }}>
                  <span style={{ ...styles.stepNumber, ...(tfaStep >= 3 ? styles.stepNumberActive : {}) }}>3</span>
                  <span>启用验证</span>
                </div>
              </div>

              {tfaStep === 1 && (
                <>
                  <p style={styles.modalDesc}>
                    两步验证可为账户提供额外保护。开启后登录时需输入手机验证码。
                  </p>
                  <input
                    style={styles.tfaInput}
                    type="tel"
                    maxLength={11}
                    placeholder="请输入手机号"
                    value={tfaPhone}
                    onChange={(e) => {
                      setTfaPhone(e.target.value.replace(/\D/g, ''));
                      setTfaError('');
                    }}
                  />
                  {tfaError && <p style={styles.tfaError}>{tfaError}</p>}
                  <div style={styles.modalActions}>
                    <button style={styles.modalCancel} onClick={handleClose2FA}>
                      取消
                    </button>
                    <button
                      style={{ ...styles.modalConfirm, ...(tfaLoading ? styles.modalConfirmDisabled : {}) }}
                      disabled={tfaLoading}
                      onClick={() => void handleSendCode()}
                    >
                      {tfaLoading ? '发送中...' : '获取验证码'}
                    </button>
                  </div>
                </>
              )}

              {tfaStep === 2 && (
                <>
                  <p style={styles.modalDesc}>
                    验证码已发送至 <strong>{tfaPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</strong>
                  </p>
                  <input
                    style={styles.tfaInput}
                    type="text"
                    maxLength={6}
                    placeholder="请输入6位验证码"
                    value={tfaCode}
                    onChange={(e) => {
                      setTfaCode(e.target.value.replace(/\D/g, ''));
                      setTfaError('');
                    }}
                  />
                  {tfaError && <p style={styles.tfaError}>{tfaError}</p>}
                  <div style={styles.modalActions}>
                    <button style={styles.modalCancel} onClick={handleClose2FA}>
                      取消
                    </button>
                    <button
                      style={{ ...styles.modalConfirm, ...(tfaLoading ? styles.modalConfirmDisabled : {}) }}
                      disabled={tfaLoading}
                      onClick={() => void handleVerifyCode()}
                    >
                      {tfaLoading ? '验证中...' : '验证并启用'}
                    </button>
                  </div>
                  <div style={styles.tfaResendRow}>
                    {countdown > 0 ? (
                      <span style={styles.tfaCountdown}>{countdown}秒后可重新发送</span>
                    ) : (
                      <button style={styles.tfaResendBtn} onClick={() => void handleSendCode()}>
                        重新发送验证码
                      </button>
                    )}
                    <button style={styles.tfaBackBtn} onClick={() => setTfaStep(1)}>
                      返回上一步
                    </button>
                  </div>
                </>
              )}

              {tfaStep === 3 && (
                <>
                  <div style={styles.tfaSuccessIcon}>✅</div>
                  <p style={{ ...styles.modalDesc, textAlign: 'center' }}>
                    两步验证已成功启用！<br />
                    下次登录时请使用 <strong>{tfaPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</strong> 接收验证码。
                  </p>
                  <div style={styles.modalActions}>
                    <button
                      style={styles.modalConfirm}
                      onClick={handleClose2FA}
                    >
                      完成
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeviceModal && selectedDevice && (
        <div style={styles.modalOverlay} onClick={() => setShowDeviceModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>设备详情</h3>
              <button style={styles.closeBtn} onClick={() => setShowDeviceModal(false)}>✕</button>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>设备名称</span>
                <span style={styles.detailValue}>{selectedDevice.name}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>IP地址</span>
                <span style={styles.detailValue}>{selectedDevice.ip}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>位置</span>
                <span style={styles.detailValue}>{selectedDevice.location}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>最后登录</span>
                <span style={styles.detailValue}>
                  {new Date(selectedDevice.lastLogin).toLocaleString('zh-CN')}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>状态</span>
                <span style={selectedDevice.isCurrentDevice ? styles.statusActive : styles.statusInactive}>
                  {selectedDevice.isCurrentDevice ? '当前设备' : '已登录'}
                </span>
              </div>
              {!selectedDevice.isCurrentDevice && (
                <button
                  style={styles.removeDeviceBtn}
                  onClick={() => {
                    handleRemoveDevice(selectedDevice.id);
                    setShowDeviceModal(false);
                  }}
                >
                  移除此设备
                </button>
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
    maxWidth: '600px',
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
  securityLevelCard: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid #e5e7eb',
  },
  securityLevelHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },
  securityLevelIcon: {
    fontSize: '32px',
  },
  securityLevelInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  securityLevelLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  securityLevelValue: {
    fontSize: '20px',
    fontWeight: '600',
  },
  securityLevelBarContainer: {
    display: 'flex',
    gap: '6px',
    marginBottom: '8px',
  },
  securityLevelBarSegment: {
    flex: 1,
    height: '8px',
    borderRadius: '4px',
    transition: 'background-color 0.3s',
  },
  securityLevelTip: {
    margin: 0,
    fontSize: '13px',
    color: '#6b7280',
  },
  section: {
    marginBottom: '20px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  sectionActionBtn: {
    padding: '6px 12px',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  settingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  settingInfo: {
    display: 'flex',
    gap: '12px',
  },
  settingIcon: {
    fontSize: '20px',
  },
  settingDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  settingName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a2e',
  },
  settingDescription: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  toggleBtn: {
    width: '48px',
    height: '28px',
    backgroundColor: '#d1d5db',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s',
  },
  toggleBtnActive: {
    backgroundColor: '#3b82f6',
  },
  toggleKnob: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '24px',
    height: '24px',
    backgroundColor: 'white',
    borderRadius: '50%',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    transition: 'transform 0.2s',
  },
  actionBtn: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  actionBtnActive: {
    backgroundColor: '#22c55e',
    color: 'white',
    borderColor: '#22c55e',
  },
  infoBadge: {
    fontSize: '16px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px',
    color: '#6b7280',
  },
  loadingSpinner: {
    fontSize: '20px',
    marginBottom: '8px',
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px',
    color: '#6b7280',
    fontSize: '14px',
  },
  devicesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  deviceItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '1px solid transparent',
  },
  currentDevice: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  deviceIcon: {
    position: 'relative',
    fontSize: '24px',
    marginRight: '12px',
  },
  currentDeviceBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    fontSize: '10px',
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '1px 4px',
    borderRadius: '4px',
  },
  deviceInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  deviceName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a2e',
  },
  deviceLocation: {
    fontSize: '12px',
    color: '#6b7280',
  },
  deviceDetails: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginRight: '12px',
  },
  deviceIP: {
    fontSize: '11px',
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  deviceTime: {
    fontSize: '12px',
    color: '#6b7280',
  },
  removeDeviceBtn: {
    padding: '6px 12px',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontSize: '12px',
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
  modalDesc: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
  },
  tfaSteps: {
    display: 'flex',
    justifyItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  tfaStep: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#9ca3af',
    transition: 'color 0.2s',
  },
  tfaStepActive: {
    color: '#3b82f6',
    fontWeight: 500,
  },
  stepNumber: {
    width: '24px',
    height: '24px',
    backgroundColor: '#d1d5db',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    transition: 'background-color 0.2s',
  },
  stepNumberActive: {
    backgroundColor: '#3b82f6',
  },
  tfaInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    letterSpacing: '2px',
    textAlign: 'center' as const,
  },
  tfaError: {
    margin: 0,
    color: '#ef4444',
    fontSize: '12px',
  },
  tfaResendRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
  },
  tfaCountdown: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  tfaResendBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '12px',
    padding: 0,
  },
  tfaBackBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: '12px',
    padding: 0,
  },
  tfaSuccessIcon: {
    fontSize: '48px',
    textAlign: 'center' as const,
    margin: '12px 0',
  },
  modalConfirmDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed' as const,
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
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
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
};

export default SecuritySettingsPanel;
