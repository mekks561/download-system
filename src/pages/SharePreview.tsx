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

interface ShareApiResponse {
  success: boolean;
  message?: string;
  data?: ShareFile;
}

const SharePreview: React.FC = () => {
  const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
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

    void fetchShareInfo(token);
  }, [token]);

  const fetchShareInfo = async (shareToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/shares/${shareToken}`);
      const data = (await response.json()) as ShareApiResponse;

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

      setFile(data.data ?? null);
      setLoading(false);
    } catch {
      setError('无法连接到服务器');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/shares/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = (await response.json()) as ShareApiResponse;

      if (!data.success) {
        if (data.message === '请输入访问密码') {
          setError('请输入访问密码');
        } else {
          setError(data.message || '密码错误');
        }
        return;
      }

      setFile(data.data ?? null);
      setShowPasswordInput(false);
      setPassword('');
      setError('');
    } catch {
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

      const response = await fetch(`${API_BASE_URL}/shares/${token}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const data = (await response.json()) as ShareApiResponse;
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

      void fetchShareInfo(token);
    } catch {
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="bg-white rounded-xl p-8 shadow-2xl">
          <div className="text-center">
            <span className="text-5xl mb-4 block">🔄</span>
            <p className="text-gray-500">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="bg-white rounded-xl p-8 shadow-2xl text-center">
          <span className="text-5xl mb-4 block">❌</span>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => void navigate('/')}
            className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (showPasswordInput) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="bg-white rounded-xl p-8 shadow-2xl w-full max-w-md">
          <div className="text-center">
            <span className="text-6xl mb-4 block">🔒</span>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">此分享需要密码</h2>
            <p className="text-sm text-gray-500 mb-6">请输入访问密码以查看和下载文件</p>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <form onSubmit={(e) => void handlePasswordSubmit(e)}>
              <input
                type="password"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码..."
                autoFocus
              />
              <button
                type="submit"
                className="w-full mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="bg-white rounded-xl p-8 shadow-2xl text-center">
          <span className="text-5xl mb-4 block">❌</span>
          <p className="text-gray-500 mb-6">无法获取分享信息</p>
          <button
            onClick={() => void navigate('/')}
            className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-600 to-purple-600">
      <div className="bg-white rounded-xl p-8 shadow-2xl w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-5xl mb-2 block">🔗</span>
          <h1 className="text-2xl font-bold text-gray-900">文件分享</h1>
        </div>

        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-6">
          <span className="text-5xl">{getFileIcon(file.mime_type)}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{file.original_name}</h2>
            <div className="flex gap-2 mt-1">
              <span className="px-2 py-0.5 bg-white rounded text-xs text-gray-500">📄 {formatFileSize(file.file_size)}</span>
              <span className={`px-2 py-0.5 bg-white rounded text-xs ${file.requires_password ? 'text-amber-600' : 'text-emerald-600'}`}>
                🔐 {file.requires_password ? '已加密' : '公开'}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">分享信息</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-500 block">有效状态</span>
              <span className={`text-sm font-semibold ${file.is_available ? 'text-emerald-500' : 'text-red-500'}`}>
                {file.is_available ? '✅ 可用' : '❌ 不可用'}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-500 block">剩余下载</span>
              <span className="text-sm font-semibold text-gray-900">
                {file.remaining_downloads === -1 ? '不限次数' : `${file.remaining_downloads} 次`}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-500 block">过期时间</span>
              <span className="text-sm font-semibold text-gray-900">
                {file.expires_at ? formatDate(file.expires_at) : '永久有效'}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-500 block">文件类型</span>
              <span className="text-sm font-semibold text-gray-900">
                {file.mime_type.split('/')[1]?.toUpperCase() || '文件'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              file.is_available && !isDownloading
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={() => void handleDownload()}
            disabled={!file.is_available || isDownloading}
          >
            {isDownloading ? '⏳ 下载中...' : '⬇️ 下载文件'}
          </button>
          <button
            onClick={() => void copyLink()}
            className="px-4 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors"
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>

        <div className="text-center pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">分享链接由下载管理系统生成</p>
        </div>
      </div>
    </div>
  );
};

export default SharePreview;