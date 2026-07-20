import { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Download, 
  Upload, 
  RefreshCw, 
  LogOut, 
  User, 
  Mail,
  Calendar,
  Folder,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import GmAuthService, { GmUser } from '../services/gmAuthService';
import GmDashboardService, { StatsData, UserData, DownloadData, UploadData, PaginationInfo } from '../services/gmDashboardService';

interface DashboardProps {
  onLogout: () => void;
}

type TabType = 'stats' | 'users' | 'downloads' | 'uploads';

const statusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: '已完成', color: 'bg-green-500' },
  downloading: { label: '下载中', color: 'bg-blue-500' },
  uploading: { label: '上传中', color: 'bg-blue-500' },
  pending: { label: '等待中', color: 'bg-gray-500' },
  cancelled: { label: '已取消', color: 'bg-red-500' },
  failed: { label: '失败', color: 'bg-red-500' },
  paused: { label: '已暂停', color: 'bg-yellow-500' },
};

const roleConfig: Record<string, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  moderator: '版主',
  viewer: '查看者',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { page, pages } = pagination;

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>
      <span className="text-sm text-gray-600">
        第 {page} 页 / 共 {pages} 页
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [downloads, setDownloads] = useState<DownloadData[]>([]);
  const [uploads, setUploads] = useState<UploadData[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [userPagination, setUserPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, pages: 1 });
  const [downloadPagination, setDownloadPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, pages: 1 });
  const [uploadPagination, setUploadPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, pages: 1 });

  const authService = GmAuthService.getInstance();
  const dashboardService = GmDashboardService.getInstance();
  const currentUser = authService.getCurrentUser() as GmUser;

  const loadStats = useCallback(async () => {
    try {
      const statsData = await dashboardService.getStats();
      if (statsData.success && statsData.data) {
        setStats(statsData.data);
        setError('');
      } else {
        setError(statsData.message || '获取统计数据失败');
      }
    } catch {
      setError('获取统计数据失败');
    }
  }, []);

  const loadUsers = useCallback(async (page: number = 1, search: string = '') => {
    try {
      const usersData = await dashboardService.getUsers(page, 10, search);
      if (usersData.success && usersData.data) {
        setUsers(usersData.data);
        if (usersData.pagination) {
          setUserPagination(usersData.pagination);
        }
        setError('');
      } else {
        setError(usersData.message || '获取用户列表失败');
      }
    } catch {
      setError('获取用户列表失败');
    }
  }, []);

  const loadDownloads = useCallback(async (page: number = 1, search: string = '', status: string = '') => {
    try {
      const downloadsData = await dashboardService.getAllDownloads(page, 10, search, status);
      if (downloadsData.success && downloadsData.data) {
        setDownloads(downloadsData.data);
        if (downloadsData.pagination) {
          setDownloadPagination(downloadsData.pagination);
        }
        setError('');
      } else {
        setError(downloadsData.message || '获取下载记录失败');
      }
    } catch {
      setError('获取下载记录失败');
    }
  }, []);

  const loadUploads = useCallback(async (page: number = 1, search: string = '', status: string = '') => {
    try {
      const uploadsData = await dashboardService.getAllUploads(page, 10, search, status);
      if (uploadsData.success && uploadsData.data) {
        setUploads(uploadsData.data);
        if (uploadsData.pagination) {
          setUploadPagination(uploadsData.pagination);
        }
        setError('');
      } else {
        setError(uploadsData.message || '获取上传记录失败');
      }
    } catch {
      setError('获取上传记录失败');
    }
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {
      await loadStats();
      await loadUsers();
      await loadDownloads();
      await loadUploads();
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  };

  useEffect(() => {
    void loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      void loadUsers(1, searchQuery);
    } else if (activeTab === 'downloads') {
      void loadDownloads(1, searchQuery, statusFilter);
    } else if (activeTab === 'uploads') {
      void loadUploads(1, searchQuery, statusFilter);
    }
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'users') {
      void loadUsers(1, searchQuery);
    } else if (activeTab === 'downloads') {
      void loadDownloads(1, searchQuery, statusFilter);
    } else if (activeTab === 'uploads') {
      void loadUploads(1, searchQuery, statusFilter);
    }
  };

  const handleDeleteUser = async (id: number) => {
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
        setError(response.message || '删除用户失败');
      }
    } catch {
      setError('删除用户时发生错误');
    }
  };

  const tabs: Array<{ key: TabType; label: string; icon: React.ReactNode }> = [
    { key: 'stats', label: '数据概览', icon: <LayoutDashboard className="w-5 h-5" /> },
    { key: 'users', label: '用户管理', icon: <Users className="w-5 h-5" /> },
    { key: 'downloads', label: '下载记录', icon: <Download className="w-5 h-5" /> },
    { key: 'uploads', label: '上传记录', icon: <Upload className="w-5 h-5" /> },
  ];

  if (!initialLoadDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">加载GM后台数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-purple-600" />
              GM后台管理系统
            </h1>
            <p className="text-sm text-gray-500">独立管理面板 - 与主应用完全分离</p>
          </div>
          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-5 h-5" />
                <span className="font-medium">{currentUser.name || currentUser.username}</span>
                <span className="text-sm text-gray-500">({roleConfig[currentUser.role] || currentUser.role})</span>
              </div>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      </header>

      {message && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg">
            {message}
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        </div>
      )}

      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => void loadAllData()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-all ml-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pb-8">
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <div className="text-4xl mb-2">👥</div>
                <div className="text-3xl font-bold text-gray-900">{stats?.userCount || 0}</div>
                <div className="text-sm text-gray-500">总用户数</div>
              </div>
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <div className="text-4xl mb-2">📥</div>
                <div className="text-3xl font-bold text-gray-900">{stats?.downloadCount || 0}</div>
                <div className="text-sm text-gray-500">总下载数</div>
              </div>
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <div className="text-4xl mb-2">📤</div>
                <div className="text-3xl font-bold text-gray-900">{stats?.uploadCount || 0}</div>
                <div className="text-sm text-gray-500">总上传数</div>
              </div>
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <div className="text-4xl mb-2">📅</div>
                <div className="text-3xl font-bold text-gray-900">
                  {(stats?.todayDownloads || 0) + (stats?.todayUploads || 0)}
                </div>
                <div className="text-sm text-gray-500">今日任务</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">下载状态分布</h3>
                <div className="space-y-4">
                  {stats?.downloadStatusStats && stats.downloadStatusStats.length > 0 ? (
                    stats.downloadStatusStats.map((stat, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm text-gray-700 mb-1">
                          <span>{statusConfig[stat.status]?.label || stat.status}</span>
                          <span>{stat.count}</span>
                        </div>
                        <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${statusConfig[stat.status]?.color || 'bg-gray-500'}`}
                            style={{ width: `${(stat.count / (stats.downloadCount || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">暂无数据</div>
                  )}
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">上传状态分布</h3>
                <div className="space-y-4">
                  {stats?.uploadStatusStats && stats.uploadStatusStats.length > 0 ? (
                    stats.uploadStatusStats.map((stat, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm text-gray-700 mb-1">
                          <span>{statusConfig[stat.status]?.label || stat.status}</span>
                          <span>{stat.count}</span>
                        </div>
                        <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${statusConfig[stat.status]?.color || 'bg-gray-500'}`}
                            style={{ width: `${(stat.count / (stats.uploadCount || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">暂无数据</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索用户名或邮箱..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  搜索
                </button>
              </form>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">用户名</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">邮箱</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">角色</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">下载数</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">上传数</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">注册时间</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{user.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'super_admin' ? 'bg-red-100 text-red-700' :
                          user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                          user.role === 'moderator' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {roleConfig[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{user.downloadCount}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{user.uploadCount}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{formatDate(user.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                          <button
                            onClick={() => void handleDeleteUser(user.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            删除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">暂无用户数据</td>
                  </tr>
                )}
              </tbody>
            </table>
            {userPagination.pages > 1 && (
              <Pagination pagination={userPagination} onPageChange={(page) => void loadUsers(page, searchQuery)} />
            )}
          </div>
        )}

        {activeTab === 'downloads' && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索文件名或URL..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="">全部状态</option>
                  <option value="completed">已完成</option>
                  <option value="downloading">下载中</option>
                  <option value="pending">等待中</option>
                  <option value="cancelled">已取消</option>
                  <option value="failed">失败</option>
                </select>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  搜索
                </button>
              </form>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">用户</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">文件名</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">状态</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">进度</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">大小</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {downloads.length > 0 ? (
                  downloads.map((download) => (
                    <tr key={download.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{download.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{download.username || download.email || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 truncate max-w-xs" title={download.url}>
                            {download.filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusConfig[download.status]?.color || 'bg-gray-500'}`}
                        >
                          {statusConfig[download.status]?.label || download.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{download.progress.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatBytes(download.total_bytes)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatDate(download.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">暂无下载记录</td>
                  </tr>
                )}
              </tbody>
            </table>
            {downloadPagination.pages > 1 && (
              <Pagination pagination={downloadPagination} onPageChange={(page) => void loadDownloads(page, searchQuery, statusFilter)} />
            )}
          </div>
        )}

        {activeTab === 'uploads' && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索文件名..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="">全部状态</option>
                  <option value="completed">已完成</option>
                  <option value="uploading">上传中</option>
                  <option value="pending">等待中</option>
                  <option value="cancelled">已取消</option>
                  <option value="failed">失败</option>
                </select>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  搜索
                </button>
              </form>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">用户</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">文件名</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">状态</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">进度</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">大小</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {uploads.length > 0 ? (
                  uploads.map((upload) => (
                    <tr key={upload.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{upload.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{upload.username || upload.email || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{upload.original_filename}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusConfig[upload.status]?.color || 'bg-gray-500'}`}
                        >
                          {statusConfig[upload.status]?.label || upload.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{upload.progress.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatBytes(upload.total_bytes)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatDate(upload.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">暂无上传记录</td>
                  </tr>
                )}
              </tbody>
            </table>
            {uploadPagination.pages > 1 && (
              <Pagination pagination={uploadPagination} onPageChange={(page) => void loadUploads(page, searchQuery, statusFilter)} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;