import React, { useState, useMemo, useCallback } from 'react';
import { usePagination, useServerPagination } from '../hooks/usePagination';
import { Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Card, CardHeader, CardTitle, CardContent, Badge, Separator } from '../components/ui/shadcn';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

const mockUsers: User[] = Array.from({ length: 150 }, (_, i) => ({
  id: i + 1,
  name: `用户 ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: ['管理员', '编辑', '普通用户'][i % 3],
  status: i % 5 === 0 ? 'inactive' : 'active',
  createdAt: new Date(2024, 0, 1 + (i % 365)).toISOString()
}));

const UserCard = React.memo(({ user }: { user: User }) => {
  const getRoleVariant = () => {
    switch (user.role) {
      case '管理员':
        return 'error';
      case '编辑':
        return 'warning';
      default:
        return 'success';
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-primary-500 flex justify-between items-center">
      <div>
        <div className="font-semibold text-base text-gray-900">{user.name}</div>
        <div className="text-gray-500 text-sm mt-1">{user.email}</div>
      </div>
      <div className="flex gap-3 items-center">
        <Badge variant={getRoleVariant()}>{user.role}</Badge>
        <Badge variant={user.status === 'active' ? 'success' : 'error'}>
          {user.status === 'active' ? '活跃' : '停用'}
        </Badge>
      </div>
    </div>
  );
});

UserCard.displayName = 'UserCard';

const PaginationButtons = React.memo(({ 
  currentPage, 
  totalPages, 
  visiblePages, 
  hasNextPage, 
  hasPreviousPage, 
  goToPage, 
  nextPage, 
  previousPage 
}: { 
  currentPage: number;
  totalPages: number;
  visiblePages: number[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
}) => {
  return (
    <div className="flex gap-2 items-center">
      <Button
        onClick={() => goToPage(1)}
        disabled={currentPage === 1}
        variant={currentPage === 1 ? 'secondary' : 'default'}
        size="sm"
      >
        首页
      </Button>
      <Button
        onClick={previousPage}
        disabled={!hasPreviousPage}
        variant={!hasPreviousPage ? 'secondary' : 'default'}
        size="sm"
      >
        上一页
      </Button>

      <div className="flex gap-1">
        {(() => {
          let ellipsisCount = 0;
          return visiblePages.map((page) => {
            if (page === -1) {
              ellipsisCount++;
              return <span key={`ellipsis-${ellipsisCount}`} className="px-2 text-gray-400">...</span>;
            }
            return (
              <Button
                key={page}
                onClick={() => goToPage(page)}
                variant={currentPage === page ? 'default' : 'secondary'}
                size="sm"
                className="min-w-[40px]"
              >
                {page}
              </Button>
            );
          });
        })()}
      </div>

      <Button
        onClick={nextPage}
        disabled={!hasNextPage}
        variant={!hasNextPage ? 'secondary' : 'default'}
        size="sm"
      >
        下一页
      </Button>
      <Button
        onClick={() => goToPage(totalPages)}
        disabled={currentPage === totalPages}
        variant={currentPage === totalPages ? 'secondary' : 'default'}
        size="sm"
      >
        末页
      </Button>
    </div>
  );
});

PaginationButtons.displayName = 'PaginationButtons';

const PaginationExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'client' | 'server'>('client');
  const [filterText, setFilterText] = useState('');

  const filteredUsers = useMemo(() => {
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      return mockUsers.filter(user => 
        user.name.toLowerCase().includes(lowerFilter) ||
        user.email.toLowerCase().includes(lowerFilter)
      );
    }
    return mockUsers;
  }, [filterText]);

  const handleTabChange = useCallback((tab: 'client' | 'server') => {
    setActiveTab(tab);
  }, []);

  const {
    currentPage,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    visiblePages,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    resetPagination,
    getPaginationInfo
  } = usePagination({
    totalItems: filteredUsers.length,
    initialPage: 1,
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50],
    maxPageButtons: 7
  });

  const fetchData = useCallback(async (page: number, size: number) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const filtered = filterText 
      ? mockUsers.filter(u => 
          u.name.toLowerCase().includes(filterText.toLowerCase()) ||
          u.email.toLowerCase().includes(filterText.toLowerCase())
        )
      : mockUsers;
    
    const start = (page - 1) * size;
    const end = start + size;
    return {
      data: filtered.slice(start, end),
      total: filtered.length
    };
  }, [filterText]);

  const {
    data: serverData,
    totalItems: serverTotal,
    currentPage: serverPage,
    pageSize: serverPageSize,
    totalPages: serverTotalPages,
    isLoading,
    visiblePages: serverVisiblePages,
    goToPage: serverGoToPage,
    nextPage: serverNextPage,
    previousPage: serverPrevPage,
    setPageSize: serverSetPageSize,
    refresh: serverRefresh
  } = useServerPagination({
    initialPage: 1,
    initialPageSize: 10,
    pageSizeOptions: [10, 20, 50, 100],
    fetchData
  });

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(startIndex - 1, endIndex);
  }, [filteredUsers, startIndex, endIndex]);

  const paginationInfo = useMemo(() => {
    return getPaginationInfo();
  }, [getPaginationInfo]);

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value));
  }, [setPageSize]);

  const handleServerPageSizeChange = useCallback((value: string) => {
    serverSetPageSize(Number(value));
  }, [serverSetPageSize]);

  const handleFilterWithReset = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
    if (activeTab === 'client') {
      resetPagination();
    } else {
      serverGoToPage(1);
    }
  }, [activeTab, resetPagination, serverGoToPage]);

  return (
    <div className="p-5 md:p-10 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="mb-8 text-2xl md:text-3xl font-bold text-gray-900 text-center">
          📄 usePagination Hook 示例
        </h1>

        <div className="flex gap-4 mb-6 justify-center">
          <Button
            onClick={() => handleTabChange('client')}
            variant={activeTab === 'client' ? 'default' : 'secondary'}
            size="lg"
          >
            🖥️ 客户端分页
          </Button>
          <Button
            onClick={() => handleTabChange('server')}
            variant={activeTab === 'server' ? 'default' : 'secondary'}
            size="lg"
          >
            🌐 服务端分页
          </Button>
        </div>

        <div className="mb-6">
          <Input
            type="text"
            placeholder="搜索用户名称或邮箱..."
            value={filterText}
            onChange={handleFilterWithReset}
            className="h-12 text-base"
          />
        </div>

        {activeTab === 'client' ? (
          <Card className="mb-8">
            <CardHeader className="pb-4 border-b-2 border-primary-500">
              <CardTitle className="text-xl text-gray-900">客户端分页演示</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <span className="font-semibold text-primary-500">总记录数：</span>
                    <span className="ml-2 text-lg">{filteredUsers.length}</span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-gray-500">每页显示：</span>
                    <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 10, 20, 50].map(size => (
                          <SelectItem key={size} value={String(size)}>{size} 条/页</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={resetPagination}>
                      重置
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 mb-6">
                {paginatedUsers.map(user => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t-2 border-gray-200">
                <div className="text-gray-500 text-sm">{paginationInfo.showing}</div>
                <PaginationButtons
                  currentPage={currentPage}
                  totalPages={totalPages}
                  visiblePages={visiblePages}
                  hasNextPage={hasNextPage}
                  hasPreviousPage={hasPreviousPage}
                  goToPage={goToPage}
                  nextPage={nextPage}
                  previousPage={previousPage}
                />
                <div className="text-gray-500 text-sm">{paginationInfo.pageRange}</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardHeader className="pb-4 border-b-2 border-primary-500">
              <CardTitle className="text-xl text-gray-900">服务端分页演示</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <span className="font-semibold text-primary-500">总记录数：</span>
                    <span className="ml-2 text-lg">{serverTotal}</span>
                    {isLoading && <span className="ml-4 text-gray-500">加载中...</span>}
                  </div>
                  <div className="flex gap-3 items-center">
                    <span className="text-gray-500">每页显示：</span>
                    <Select value={String(serverPageSize)} onValueChange={handleServerPageSizeChange}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 50, 100].map(size => (
                          <SelectItem key={size} value={String(size)}>{size} 条/页</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="default" onClick={serverRefresh} disabled={isLoading}>
                      刷新
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 mb-6 min-h-[300px]">
                {isLoading ? (
                  <div className="text-center py-15 text-gray-500 text-lg">⏳ 正在加载数据...</div>
                ) : serverData.length === 0 ? (
                  <div className="text-center py-15 text-gray-400 text-lg">😔 没有找到匹配的数据</div>
                ) : (
                  (serverData as User[]).map(user => (
                    <UserCard key={user.id} user={user} />
                  ))
                )}
              </div>

              {!isLoading && serverData.length > 0 && (
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t-2 border-gray-200">
                  <div className="text-gray-500 text-sm">第 {serverPage} 页，共 {serverTotalPages || 0} 页</div>
                  <PaginationButtons
                    currentPage={serverPage}
                    totalPages={serverTotalPages || 0}
                    visiblePages={serverVisiblePages}
                    hasNextPage={serverPage < (serverTotalPages || 1)}
                    hasPreviousPage={serverPage > 1}
                    goToPage={serverGoToPage}
                    nextPage={serverNextPage}
                    previousPage={serverPrevPage}
                  />
                  <div className="text-gray-500 text-sm">第 {serverPage} / {serverTotalPages || 0} 页</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-4 border-b-2 border-primary-500">
            <CardTitle className="text-lg text-gray-900">📚 Hook API 说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 text-sm leading-relaxed">
              <div>
                <h4 className="text-primary-500 mb-2 font-semibold">usePagination Hook</h4>
                <p className="text-gray-500 mb-3">
                  用于客户端分页管理，适用于数据已经全部加载到前端的场景。
                </p>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs">
                  <div className="mb-2">
                    <span className="font-semibold">核心属性：</span>
                  </div>
                  <div className="ml-4">
                    <div>• currentPage: 当前页码</div>
                    <div>• pageSize: 每页条数</div>
                    <div>• totalPages: 总页数</div>
                    <div>• startIndex / endIndex: 当前页数据范围</div>
                    <div>• visiblePages: 可视页码数组</div>
                  </div>
                  <div className="mt-3 mb-2">
                    <span className="font-semibold">核心方法：</span>
                  </div>
                  <div className="ml-4">
                    <div>• goToPage(page): 跳转到指定页</div>
                    <div>• nextPage() / previousPage(): 下一页/上一页</div>
                    <div>• setPageSize(size): 设置每页条数</div>
                    <div>• resetPagination(): 重置分页状态</div>
                    <div>• getPaginationInfo(): 获取分页信息文本</div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-primary-500 mb-2 font-semibold">useServerPagination Hook</h4>
                <p className="text-gray-500 mb-3">
                  用于服务端分页管理，适用于数据需要从服务器分页获取的场景。
                </p>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs">
                  <div className="mb-2">
                    <span className="font-semibold">额外属性：</span>
                  </div>
                  <div className="ml-4">
                    <div>• data: 当前页数据</div>
                    <div>• totalItems: 总记录数</div>
                    <div>• isLoading: 加载状态</div>
                    <div>• error: 错误信息</div>
                    <div>• refresh(): 刷新数据</div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-primary-500 mb-2 font-semibold">配置选项</h4>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs">
                  <div>• initialPage: 初始页码 (默认: 1)</div>
                  <div>• initialPageSize: 初始每页条数 (默认: 10)</div>
                  <div>• pageSizeOptions: 每页条数选项 (默认: [10, 20, 50, 100])</div>
                  <div>• maxPageButtons: 最多显示页码按钮数 (默认: 7)</div>
                  <div>• syncToUrl: 是否同步到URL参数 (默认: false)</div>
                  <div>• urlParamName: URL参数名称 (默认: 'page')</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaginationExample;