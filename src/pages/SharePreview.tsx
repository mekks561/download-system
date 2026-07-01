import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface ShareFile {
  id: number;
  original_name: string;
  file_size: number;
  mime_type: string;
  requires_password: boolean;
  is_available: boolean;
  expires_at: string | null;
  remaining_downloads: number;
}

const API_BASE = 'http://localhost:5001/api';

const SharePreview: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [file, setFile] = useState<ShareFile | null>(null);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('无效的分享链接');
      setLoading(false);
      return;
    }

    fetchShareInfo(token);
  }, [token]);

  const fetchShareInfo = async (shareToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/shares/${shareToken}`);
      const data = await response.json();

      if (!data.success) {
        if (data.message === '请输入访问密码') {
          setShowPasswordInput(true);
          setLoading(false);
          return;
        }
        setError(data.message || '分享链接无效');
        setLoading(false);
        return;
      }

      setFile(data.data);
      setLoading(false);
    } catch (err) {
      setError('无法连接到服务器');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !token) return;

    try {
      const response = await fetch(`${API_BASE}/shares/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await response.json();

      if (!data.success) {
        if (data.message === '请输入访问密码') {
          setError('请输入访问密码');
        } else {
          setError(data.message || '密码错误');
        }
        return;
      }

      setFile(data.data);
      setShowPasswordInput(false);
      setPassword('');
      setError('');
    } catch (err) {
      setError('验证失败，请重试');
    }
  };

  const handleDownload = async () => {
    if (!token || !file || !file.is_available) return;

    setIsDownloading(true);
    try {
      const params: { password?: string } = {};
      if (file.requires_password) {
        params.password = password;
      }

      const response = await fetch(`${API_BASE}/shares/${token}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.message === '请输入访问密码') {
          setShowPasswordInput(true);
        } else {
          setError(data.message || '下载失败');
        }
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      fetchShareInfo(token);
    } catch (err) {
      setError('下载失败，请重试');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '📦';
    if (mimeType.includes('text/')) return '📄';
    return '📁';
  };

  const copyLink = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loading}>
            <span>🔄</span>
            <p>加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.error}>
            <span>❌</span>
            <p>{error}</p>
            <button style={styles.backButton} onClick={() => navigate('/')}>
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showPasswordInput) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.passwordForm}>
            <div style={styles.lockIcon}>🔒</div>
            <h2 style={styles.title}>此分享需要密码</h2>
            <p style={styles.description}>请输入访问密码以查看和下载文件</p>
            {error && <p style={styles.errorText}>{error}</p>}
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                style={styles.passwordInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码..."
                autoFocus
              />
              <button style={styles.submitButton} type="submit">
                确认
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.error}>
            <span>❌</span>
            <p>无法获取分享信息</p>
            <button style={styles.backButton} onClick={() => navigate('/')}>
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>🔗</div>
          <h1 style={styles.title}>文件分享</h1>
        </div>

        <div style={styles.fileCard}>
          <div style={styles.fileIcon}>{getFileIcon(file.mime_type)}</div>
          <div style={styles.fileInfo}>
            <h2 style={styles.fileName}>{file.original_name}</h2>
            <div style={styles.fileMeta}>
              <span style={styles.metaItem}>📄 {formatFileSize(file.file_size)}</span>
              <span style={styles.metaItem}>🔐 {file.requires_password ? '已加密' : '公开'}</span>
            </div>
          </div>
        </div>

        <div style={styles.infoSection}>
          <h3 style={styles.sectionTitle}>分享信息</h3>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>有效状态</span>
              <span style={{ ...styles.infoValue, color: file.is_available ? '#10b981' : '#ef4444' }}>
                {file.is_available ? '✅ 可用' : '❌ 不可用'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>剩余下载</span>
              <span style={styles.infoValue}>
                {file.remaining_downloads === -1 ? '不限次数' : `${file.remaining_downloads} 次`}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>过期时间</span>
              <span style={styles.infoValue}>
                {file.expires_at ? formatDate(file.expires_at) : '永久有效'}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button
            style={{
              ...styles.downloadButton,
              ...(!file.is_available ? styles.disabledButton : {}),
            }}
            onClick={handleDownload}
            disabled={!file.is_available || isDownloading}
          >
            {isDownloading ? '⏳ 下载中...' : '⬇️ 下载文件'}
          </button>
          <button style={styles.copyButton} onClick={copyLink}>
            {copied ? '✓ 已复制' : '📋 复制链接'}
          </button>
        </div>

        <div style={styles.footer}>
          <p>分享链接由下载管理系统生成</p>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logo: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1a1a2e',
    margin: 0,
  },
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  fileIcon: {
    fontSize: '48px',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a2e',
    margin: '0 0 8px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '13px',
    color: '#6b7280',
  },
  metaItem: {
    padding: '4px 8px',
    backgroundColor: 'white',
    borderRadius: '4px',
  },
  infoSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
    margin: '0 0 12px 0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  infoLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  downloadButton: {
    flex: 1,
    padding: '14px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  copyButton: {
    padding: '14px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  footer: {
    textAlign: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  footerText: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
  },
  backButton: {
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
  passwordForm: {
    textAlign: 'center',
  },
  lockIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 20px 0',
  },
  passwordInput: {
    width: '100%',
    padding: '14px',
    border: '2px solid #d1d5db',
    borderRadius: '10px',
    fontSize: '16px',
    boxSizing: 'border-box',
    marginBottom: '16px',
    outline: 'none',
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '14px',
    margin: '0 0 16px 0',
  },
};

export default SharePreview;