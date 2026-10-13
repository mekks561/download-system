import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { UserResponse, UserRole } from '@dm/shared';
import * as gm from '../services/gm';
import { errorText } from '../lib/api';
import { formatDate, formatBytes } from '../lib/format';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';

interface UserWithUsage extends UserResponse {
  storageQuota: string;
  currentUsage: string;
  downloadCount: number;
}

const ResetPasswordSchema = z.object({
  newPassword: z.string().min(8, '新密码至少 8 个字符').max(128, '新密码最多 128 个字符'),
});

type ResetPasswordForm = z.infer<typeof ResetPasswordSchema>;

/** 用户管理：搜索/角色过滤/分页表格、禁用/启用、重置密码对话框、角色切换 */
const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserWithUsage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(() => {
    setLoading(true);
    gm
      .listUsers({
        search: search || undefined,
        role: role || undefined,
        page,
        pageSize,
      })
      .then((res) => {
        setUsers(res.users);
        setTotal(res.total);
      })
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, [page, pageSize, search, role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 禁用/启用确认
  const [confirmTarget, setConfirmTarget] = useState<{ id: number; nextActive: boolean; username: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleToggleActive = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      await gm.updateUser(confirmTarget.id, { isActive: confirmTarget.nextActive });
      setUsers((prev) =>
        prev.map((u) => (u.id === confirmTarget.id ? { ...u, isActive: confirmTarget.nextActive } : u)),
      );
      setConfirmTarget(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setConfirmLoading(false);
    }
  };

  // 角色切换
  const handleRoleChange = async (id: number, nextRole: UserRole) => {
    try {
      await gm.updateUser(id, { role: nextRole });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: nextRole } : u)));
    } catch (e) {
      setError(errorText(e));
    }
  };

  // 配额修改
  const [editingQuotaUser, setEditingQuotaUser] = useState<UserWithUsage | null>(null);
  const [quotaInput, setQuotaInput] = useState('');
  
  const handleUpdateQuota = async () => {
    if (!editingQuotaUser) return;
    const quota = parseFloat(quotaInput) * 1024 * 1024 * 1024; // GB to bytes
    if (isNaN(quota)) return;
    
    try {
      await gm.updateUser(editingQuotaUser.id, { storageQuota: quota });
      setUsers((prev) =>
        prev.map((u) => (u.id === editingQuotaUser.id ? { ...u, storageQuota: quota.toString() } : u)),
      );
      setEditingQuotaUser(null);
    } catch (e) {
      setError(errorText(e));
    }
  };

  // 重置密码对话框
  const [resetUser, setResetUser] = useState<UserResponse | null>(null);
  const [resetError, setResetError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({ resolver: zodResolver(ResetPasswordSchema) });

  const onResetSubmit = handleSubmit(async (values) => {
    if (!resetUser) return;
    setResetError('');
    try {
      await gm.resetUserPassword(resetUser.id, values.newPassword);
      setResetUser(null);
      reset();
    } catch (e) {
      setResetError(errorText(e));
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-900">用户管理</h2>
      {error && (
        <div className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-600">{error}</div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-600">搜索</Label>
          <Input
            className="w-60"
            placeholder="用户名 / 邮箱"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchUsers(); } }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-600">角色</Label>
          <select
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
            value={role}
            onChange={(e) => { setRole(e.target.value as UserRole | ''); setPage(1); }}
          >
            <option value="">全部</option>
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        <Button size="sm" onClick={() => { setPage(1); fetchUsers(); }}>
          查询
        </Button>
      </div>
      <div className="rounded-md border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>用户名</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>存储占用 / 配额</TableHead>
              <TableHead>任务数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500">加载中...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500">暂无数据</TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{u.username}</span>
                      <span className="text-xs text-gray-500">{u.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <select
                      className="rounded border border-gray-200 px-2 py-1 text-sm bg-transparent"
                      value={u.role}
                      onChange={(e) => void handleRoleChange(u.id, e.target.value as UserRole)}
                    >
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col flex-1 min-w-[100px]">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span>{formatBytes(Number(u.currentUsage))}</span>
                          <span>{formatBytes(Number(u.storageQuota))}</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              Number(u.currentUsage) / Number(u.storageQuota) > 0.9 ? 'bg-error-500' : 'bg-primary-500'
                            }`}
                            style={{ width: `${Math.min(100, (Number(u.currentUsage) / Number(u.storageQuota)) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6" 
                        onClick={() => {
                          setEditingQuotaUser(u);
                          setQuotaInput((Number(u.storageQuota) / 1024 / 1024 / 1024).toString());
                        }}
                      >
                        ✏️
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{u.downloadCount}</TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? 'success' : 'error'}>
                      {u.isActive ? '正常' : '已禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant={u.isActive ? 'outline' : 'default'}
                        onClick={() =>
                          setConfirmTarget({ id: u.id, nextActive: !u.isActive, username: u.username })
                        }
                      >
                        {u.isActive ? '禁用' : '启用'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setResetUser(u); setResetError(''); reset(); }}>
                        重置密码
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />

      {/* 禁用/启用确认 */}
      <ConfirmDialog
        open={!!confirmTarget}
        title={confirmTarget?.nextActive ? '确认启用账号' : '确认禁用账号'}
        description={`${confirmTarget?.nextActive ? '启用' : '禁用'}用户「${confirmTarget?.username ?? ''}」的账号？`}
        confirmText="确认"
        loading={confirmLoading}
        onConfirm={() => { void handleToggleActive(); }}
        onCancel={() => setConfirmTarget(null)}
      />

      {/* 重置密码对话框 */}
      <Dialog open={!!resetUser} onOpenChange={(next) => { if (!next) setResetUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>为用户「{resetUser?.username}」设置新密码</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void onResetSubmit(e)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">新密码</Label>
              <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
              {errors.newPassword && <p className="text-sm text-error-600">{errors.newPassword.message}</p>}
            </div>
            {resetError && (
              <p role="alert" className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-600">{resetError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetUser(null)} disabled={isSubmitting}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 配额修改对话框 */}
      <Dialog open={!!editingQuotaUser} onOpenChange={(next) => { if (!next) setEditingQuotaUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改存储配额</DialogTitle>
            <DialogDescription>为用户「{editingQuotaUser?.username}」设置最大存储空间</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="quota">存储上限 (GB)</Label>
              <Input 
                id="quota" 
                type="number" 
                value={quotaInput} 
                onChange={(e) => setQuotaInput(e.target.value)}
                placeholder="例如: 10"
              />
              <p className="text-xs text-gray-500">
                当前已用: {formatBytes(Number(editingQuotaUser?.currentUsage || 0))}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuotaUser(null)}>取消</Button>
            <Button onClick={handleUpdateQuota}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
