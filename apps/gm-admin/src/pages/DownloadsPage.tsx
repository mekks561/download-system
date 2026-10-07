import React, { useCallback, useEffect, useState } from 'react';
import * as gm from '../services/gm';
import { errorText } from '../lib/api';
import { formatBytes, formatDate } from '../lib/format';
import {
  Badge,
  Button,
  Input,
  Label,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';

/** 下载审计：userId 过滤、分页、仅 pending/paused 可取消（409 冲突提示） */
const DownloadsTab: React.FC = () => {
  const [downloads, setDownloads] = useState<gm.GmDownloadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDownloads = useCallback(() => {
    setLoading(true);
    gm
      .listDownloads({ userId: userId ? Number(userId) : undefined, page, pageSize })
      .then((res) => {
        setDownloads(res.downloads);
        setTotal(res.total);
      })
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, [page, pageSize, userId]);

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  const [cancelTarget, setCancelTarget] = useState<gm.GmDownloadRow | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await gm.cancelDownload(cancelTarget.id);
      setDownloads((prev) =>
        prev.map((d) => (d.id === cancelTarget.id ? { ...d, status: 'cancelled' } : d)),
      );
      setCancelTarget(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setCancelLoading(false);
    }
  };

  const canCancel = (status: gm.GmDownloadRow['status']) => status === 'pending' || status === 'paused';

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-600">{error}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-600">用户 ID</Label>
          <Input
            className="w-32"
            placeholder="全部"
            inputMode="numeric"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setPage(1); }}
          />
        </div>
        <Button size="sm" onClick={() => { setPage(1); fetchDownloads(); }}>查询</Button>
      </div>
      <div className="rounded-md border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>文件名</TableHead>
              <TableHead>大小</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>进度</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-gray-500">加载中...</TableCell></TableRow>
            ) : downloads.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-gray-500">暂无数据</TableCell></TableRow>
            ) : (
              downloads.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{d.username}</span>
                      <span className="text-xs text-gray-500">{d.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-60 truncate" title={d.filename}>{d.filename}</TableCell>
                  <TableCell>{formatBytes(d.totalBytes)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        d.status === 'completed' ? 'success'
                        : d.status === 'cancelled' || d.status === 'error' ? 'error'
                        : d.status === 'downloading' ? 'default'
                        : 'warning'
                      }
                    >
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{d.progress}%</TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(d.createdAt)}</TableCell>
                  <TableCell>
                    {canCancel(d.status) && (
                      <Button size="sm" variant="destructive" onClick={() => setCancelTarget(d)}>
                        取消
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />

      <ConfirmDialog
        open={!!cancelTarget}
        title="确认取消下载"
        description={`确定要取消下载任务「${cancelTarget?.filename ?? ''}」吗？`}
        confirmText="确认取消"
        loading={cancelLoading}
        onConfirm={() => { void handleCancel(); }}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
};

/** 上传审计：只读全量列表（后端无分页） */
const UploadsTab: React.FC = () => {
  const [uploads, setUploads] = useState<gm.GmUploadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    gm.listUploads()
      .then(setUploads)
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-600">{error}</div>}
      <div className="rounded-md border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>原文件名</TableHead>
              <TableHead>大小</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-500">加载中...</TableCell></TableRow>
            ) : uploads.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-500">暂无数据</TableCell></TableRow>
            ) : (
              uploads.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell className="max-w-60 truncate" title={u.originalFilename}>{u.originalFilename}</TableCell>
                  <TableCell>{formatBytes(u.totalBytes)}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'completed' ? 'success' : u.status === 'error' ? 'error' : 'warning'}>
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(u.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

/** Downloads 页面（下载审计 + 上传审计 tab） */
const DownloadsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-900">下载审计</h2>
      <Tabs defaultValue="downloads">
        <TabsList>
          <TabsTrigger value="downloads">下载记录</TabsTrigger>
          <TabsTrigger value="uploads">上传审计</TabsTrigger>
        </TabsList>
        <TabsContent value="downloads"><DownloadsTab /></TabsContent>
        <TabsContent value="uploads"><UploadsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default DownloadsPage;
