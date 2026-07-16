import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/shadcn/Card';
import { Badge } from './ui/shadcn/Badge';
import { useToast } from './Toast';
import { API_BASE_URL } from '../constants/api';
import { formatBytes, formatDate } from '../utils/format';

interface Upload {
  id: number;
  original_name: string;
  file_size: number;
  mime_type: string;
}

interface Share {
  id: number;
  upload_id: number;
  share_token: string;
  share_url: string;
  has_password: boolean;
  expires_at: string | null;
  max_downloads: number;
  download_count: number;
  view_count: number;
  is_active: boolean;
  created_at: string;
  original_name: string;
  file_size: number;
}

interface ShareManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShareStats {
  totalShares: number;
  activeShares: number;
  totalDownloads: number;
  recentAccess: Array<{
    share_id: number;
    original_name: string;
    access_type: string;
    accessed_at: string;
    ip_address: string;
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const ShareManager: React.FC<ShareManagerProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [shares, setShares] = useState<Share[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareSettings, setShareSettings] = useState({
    password: '',
    expires_in_hours: 24,
    max_downloads: 10
  });
  const [newShareUrl, setNewShareUrl] = useState('');
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [editingShare, setEditingShare] = useState<Share | null>(null);
  const [editSettings, setEditSettings] = useState({
    password: '',
    expires_in_hours: 24,
    max_downloads: 10
  });

  useEffect(() => {
    if (isOpen) {
      void fetchShares();
      void fetchUploads();
      void fetchStats();
    }
  }, [isOpen]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/shares/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json() as ApiResponse<ShareStats>;
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('获取分享统计失败:', error);
      showToast('获取分享统计失败', 'error');
    }
  };

  const fetchShares = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/shares`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json() as ApiResponse<Share[]>;
      if (data.success && data.data) {
        setShares(data.data);
      }
    } catch (error) {
      console.error('获取分享列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUploads = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/uploads`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json() as ApiResponse<Upload[]>;
      if (data.success && data.data) {
        setUploads(data.data);
      }
    } catch (error) {
      console.error('获取上传列表失败:', error);
    }
  };

  const createShare = async () => {
    if (!selectedFile) {
      showToast('请选择要分享的文件', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/shares`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          upload_id: selectedFile,
          password: shareSettings.password || null,
          expires_in_hours: shareSettings.expires_in_hours,
          max_downloads: shareSettings.max_downloads
        })
      });

      const data = await response.json() as ApiResponse<{ share_url: string }>;
      if (data.success && data.data) {
        setNewShareUrl(data.data.share_url);
        void fetchShares();
        setShowCreate(false);
        resetForm();
        showToast('分享链接创建成功', 'success');
      } else {
        showToast(data.message || '创建分享失败', 'error');
      }
    } catch (error) {
      console.error('创建分享失败:', error);
      showToast('创建分享失败', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmId === null) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/shares/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json() as ApiResponse<unknown>;
      if (data.success) {
        void fetchShares();
        showToast('分享链接已删除', 'success');
      } else {
        showToast(data.message || '删除分享失败', 'error');
      }
    } catch (error) {
      console.error('删除分享失败:', error);
      showToast('删除分享失败', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('链接已复制到剪贴板', 'success');
    } catch {
      showToast('复制失败，请手动复制', 'error');
    }
  };

  const toggleShareStatus = async (shareId: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/shares/${shareId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json() as ApiResponse<{ is_active: boolean }>;
      if (data.success) {
        setShares(prev => prev.map(s =>
          s.id === shareId ? { ...s, is_active: data.data?.is_active ?? !currentStatus } : s
        ));
        showToast(data.message || '状态已更新', 'success');
      } else {
        showToast(data.message || '操作失败', 'error');
      }
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const startEditShare = useCallback((share: Share) => {
    setEditingShare(share);
    setEditSettings({
      password: '',
      expires_in_hours: share.expires_at ? Math.ceil((new Date(share.expires_at).getTime() - Date.now()) / (1000 * 60 * 60)) : 0,
      max_downloads: share.max_downloads
    });
  }, []);

  const updateShareSettings = async () => {
    if (!editingShare) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/shares/${editingShare.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editSettings)
      });

      const data = await response.json() as ApiResponse<Share>;
      if (data.success && data.data) {
        setShares(prev => prev.map(s =>
          s.id === editingShare.id ? { ...s, ...data.data } : s
        ));
        setEditingShare(null);
        showToast('分享设置已更新', 'success');
      } else {
        showToast(data.message || '更新失败', 'error');
      }
    } catch {
      showToast('更新失败', 'error');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setShareSettings({
      password: '',
      expires_in_hours: 24,
      max_downloads: 10
    });
  };

  

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[900px] max-w-[90vw] max-h-[90vh] bg-white rounded-xl shadow-xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">🔗 文件分享管理</h2>
          <button onClick={onClose} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg text-xl flex items-center justify-center font-bold hover:bg-red-100 transition-colors">
            ×
          </button>
        </div>

        <div className="flex gap-3 px-6 py-4 border-b border-gray-100">
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            ➕ 创建分享链接
          </button>
          <button
            onClick={() => void fetchShares()}
            disabled={loading}
            className="px-5 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            🔄 刷新
          </button>
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-5 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            📊 统计 {showStats && '(隐藏)'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {showStats && stats && (
            <Card className="mb-5">
              <CardHeader>
                <CardTitle className="text-base">📊 分享统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-500">{stats.totalShares}</div>
                    <div className="text-xs text-gray-500">总分享数</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-500">{stats.activeShares}</div>
                    <div className="text-xs text-gray-500">有效分享</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-500">{stats.totalDownloads}</div>
                    <div className="text-xs text-gray-500">总下载量</div>
                  </div>
                </div>
                {stats.recentAccess && stats.recentAccess.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">最近访问记录</h4>
                    <div className="space-y-2">
                      {stats.recentAccess.slice(0, 5).map((access, index) => (
                        <div key={index} className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg text-sm">
                          <span className="flex-1 truncate text-gray-900">{access.original_name}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            access.access_type === 'download' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {access.access_type === 'download' ? '⬇️ 下载' : '👁️ 查看'}
                          </span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(access.accessed_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {loading ? (
            <div className="text-center py-15 text-gray-500">加载中...</div>
          ) : shares.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-15 text-gray-400">
              <span className="text-5xl mb-4">🔗</span>
              <p>暂无分享链接</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                创建第一个分享链接
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {shares.map((share) => (
                <Card key={share.id} className="border-gray-100">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">{share.original_name}</div>
                        <div className="text-xs text-gray-500 mt-1">📄 {formatBytes(share.file_size)}</div>
                      </div>
                      <Badge className={share.is_active ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-500 hover:bg-gray-600'}>
                        {share.is_active ? '✓ 有效' : '✗ 已失效'}
                      </Badge>
                    </div>

                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white"
                        value={share.share_url}
                        readOnly
                      />
                      <button
                        onClick={() => { void copyToClipboard(share.share_url); }}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors whitespace-nowrap"
                      >
                        📋 复制
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">访问：</span>
                        <span>{share.view_count} 次</span>
                      </div>
                      <div>
                        <span className="font-medium">下载：</span>
                        <span>{share.download_count} / {share.max_downloads}</span>
                      </div>
                      <div>
                        <span className="font-medium">密码：</span>
                        <span>{share.has_password ? '✓ 有' : '无'}</span>
                      </div>
                      <div>
                        <span className="font-medium">过期：</span>
                        <span>{share.expires_at ? formatDate(share.expires_at) : '永久'}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { void toggleShareStatus(share.id, share.is_active); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          share.is_active
                            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                        }`}
                      >
                        {share.is_active ? '⏸️ 禁用' : '▶️ 启用'}
                      </button>
                      <button
                        onClick={() => startEditShare(share)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-md text-xs font-medium hover:bg-blue-200 transition-colors"
                      >
                        ✏️ 编辑
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(share.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-600 rounded-md text-xs font-medium hover:bg-red-200 transition-colors"
                      >
                        🗑 删除
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {showCreate && (
          <div className="px-6 py-5 border-t border-gray-100 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">创建分享链接</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">选择文件 *</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                value={selectedFile || ''}
                onChange={(e) => setSelectedFile(Number(e.target.value))}
              >
                <option value="">请选择文件</option>
                {uploads.map((upload) => (
                  <option key={upload.id} value={upload.id}>
                    {upload.original_name} ({formatBytes(upload.file_size)})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">访问密码（可选）</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                value={shareSettings.password}
                onChange={(e) => setShareSettings({
                  ...shareSettings,
                  password: e.target.value
                })}
                placeholder="留空则无密码保护"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">有效期（小时）</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  value={shareSettings.expires_in_hours}
                  onChange={(e) => setShareSettings({
                    ...shareSettings,
                    expires_in_hours: parseInt(e.target.value) || 0
                  })}
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">最大下载次数</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  value={shareSettings.max_downloads}
                  onChange={(e) => setShareSettings({
                    ...shareSettings,
                    max_downloads: parseInt(e.target.value) || 1
                  })}
                  min="1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="px-5 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => void createShare()}
                className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                创建分享
              </button>
            </div>
          </div>
        )}

        {deleteConfirmId !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirmId(null)}>
            <div className="bg-white rounded-xl p-6 max-w-sm w-[90%] shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-sm text-gray-500 mb-5">确定要删除这个分享链接吗？此操作不可撤销。</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                  className="px-5 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={() => void handleConfirmDelete()}
                  disabled={isDeleting}
                  className="px-5 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        )}

        {newShareUrl && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-[500px] text-center">
              <h3 className="text-xl font-semibold text-emerald-500 mb-5">✅ 分享链接创建成功！</h3>
              <div className="flex gap-2 mb-5">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  value={newShareUrl}
                  readOnly
                />
                <button
                  onClick={() => { void copyToClipboard(newShareUrl); }}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors whitespace-nowrap"
                >
                  📋 复制
                </button>
              </div>
              <button
                onClick={() => setNewShareUrl('')}
                className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        )}

        {editingShare && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingShare(null)}>
            <div className="bg-white rounded-xl p-6 max-w-md w-[90%] shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">✏️ 编辑分享设置</h3>
              <p className="text-sm text-gray-500 mb-4">文件：{editingShare.original_name}</p>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">新访问密码（留空保持不变）</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  value={editSettings.password}
                  onChange={(e) => setEditSettings({
                    ...editSettings,
                    password: e.target.value
                  })}
                  placeholder="设置新密码"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">有效期（小时）</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={editSettings.expires_in_hours}
                    onChange={(e) => setEditSettings({
                      ...editSettings,
                      expires_in_hours: parseInt(e.target.value) || 0
                    })}
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">最大下载次数</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={editSettings.max_downloads}
                    onChange={(e) => setEditSettings({
                      ...editSettings,
                      max_downloads: parseInt(e.target.value) || 1
                    })}
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setEditingShare(null)}
                  className="px-5 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => void updateShareSettings()}
                  className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  保存更改
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareManager;