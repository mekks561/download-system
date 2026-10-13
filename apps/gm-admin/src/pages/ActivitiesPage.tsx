import React, { useCallback, useEffect, useState } from 'react';
import * as gm from '../services/gm';
import { errorText } from '../lib/api';
import { formatDate } from '../lib/format';
import {
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
} from '../components/ui';

/** 活动审计：展示系统级操作日志，支持 userId 过滤与分页 */
const ActivitiesPage: React.FC = () => {
  const [activities, setActivities] = useState<gm.GmActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchActivities = useCallback(() => {
    setLoading(true);
    gm.listActivities({ userId: userId ? Number(userId) : undefined, page, pageSize })
      .then((res) => {
        setActivities(res.activities);
        setTotal(res.total);
      })
      .catch((e) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, [page, pageSize, userId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-900">活动审计</h2>
      {error && (
        <div className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-600">{error}</div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-600">用户 ID</Label>
          <Input
            className="w-32"
            placeholder="全部"
            inputMode="numeric"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button size="sm" onClick={() => { setPage(1); fetchActivities(); }}>
          查询
        </Button>
      </div>
      <div className="rounded-md border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>详情</TableHead>
              <TableHead>IP 地址</TableHead>
              <TableHead>时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">加载中...</TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">暂无数据</TableCell>
              </TableRow>
            ) : (
              activities.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{a.username}</span>
                      <span className="text-xs text-gray-500">ID: {a.userId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                      {a.type}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-gray-600" title={JSON.stringify(a.details)}>
                    {typeof a.details === 'string' ? a.details : JSON.stringify(a.details)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{a.ip || '-'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(a.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
    </div>
  );
};

export default ActivitiesPage;
