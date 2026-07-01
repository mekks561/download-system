import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePagination, useServerPagination } from '../hooks/usePagination';

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

// 用户卡片组件 - 使用 React.memo 优化
const UserCard = React.memo(({ user }: { user: User }) => {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        borderLeft: '4px solid #667eea',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <div>
        <div style={{ fontWeight: '600', fontSize: '16px', color: '#333' }}>
          {user.name}
        </div>
        <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
          {user.email}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{
          padding: '4px 12px',
          backgroundColor: user.role === '管理员' ? '#dc3545' : user.role === '编辑' ? '#ffc107' : '#28a745',
          color: '#fff',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {user.role}
        </span>
        <span style={{
          padding: '4px 12px',
          backgroundColor: user.status === 'active' ? '#28a745' : '#dc3545',
          color: '#fff',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {user.status === 'active' ? '活跃' : '停用'}
        </span>
      </div>
    </div>
  );
});

UserCard.displayName = 'UserCard';

// 分页按钮组件 - 使用 React.memo 优化
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
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button
        onClick={() => goToPage(1)}
        disabled={currentPage === 1}
        style={{
          padding: '8px 12px',
          backgroundColor: currentPage === 1 ? '#e0e0e0' : '#667eea',
          color: currentPage === 1 ? '#999' : '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600'
        }}
      >
        首页
      </button>
      <button
        onClick={previousPage}
        disabled={!hasPreviousPage}
        style={{
          padding: '8px 12px',
          backgroundColor: !hasPreviousPage ? '#e0e0e0' : '#667eea',
          color: !hasPreviousPage ? '#999' : '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: !hasPreviousPage ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600'
        }}
      >
        上一页
      </button>

      <div style={{ display: 'flex', gap: '4px' }}>
        {visiblePages.map((page, index) => (
          page === -1 ? (
            <span key={`ellipsis-${index}`} style={{ padding: '8px', color: '#999' }}>...</span>
          ) : (
            <button
              key={page}
              onClick={() => goToPage(page)}
              style={{
                padding: '8px 12px',
                backgroundColor: currentPage === page ? '#667eea' : '#e0e0e0',
                color: currentPage === page ? '#fff' : '#333',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                minWidth: '40px'
              }}
            >
              {page}
            </button>
          )
        ))}
      </div>

      <button
        onClick={nextPage}
        disabled={!hasNextPage}
        style={{
          padding: '8px 12px',
          backgroundColor: !hasNextPage ? '#e0e0e0' : '#667eea',
          color: !hasNextPage ? '#999' : '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: !hasNextPage ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600'
        }}
      >
        下一页
      </button>
      <button
        onClick={() => goToPage(totalPages)}
        disabled={currentPage === totalPages}
        style={{
          padding: '8px 12px',
          backgroundColor: currentPage === totalPages ? '#e0e0e0' : '#667eea',
          color: currentPage === totalPages ? '#999' : '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600'
        }}
      >
        末页
      </button>
    </div>
  );
});

PaginationButtons.displayName = 'PaginationButtons';

const PaginationExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'client' | 'server'>('client');
  const [filterText, setFilterText] = useState('');

  // 使用 useMemo 缓存过滤后的用户列表
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

  // 使用 useCallback 缓存处理函数
  const handleTabChange = useCallback((tab: 'client' | 'server') => {
    setActiveTab(tab);
  }, []);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
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

  // 使用 useCallback 缓存 fetchData 函数，避免不必要的重新渲染
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

  // 使用 useMemo 缓存分页后的用户列表
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(startIndex - 1, endIndex);
  }, [filteredUsers, startIndex, endIndex]);

  const paginationInfo = useMemo(() => {
    return getPaginationInfo();
  }, [getPaginationInfo]);

  // 使用 useCallback 包装处理函数
  const handlePageSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
  }, [setPageSize]);

  const handleServerPageSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    serverSetPageSize(Number(e.target.value));
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
    <div style={{ 
      padding: '40px', 
      backgroundColor: '#f5f5f5', 
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ 
          marginBottom: '32px', 
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#1a1a2e',
          textAlign: 'center'
        }}>
          📄 usePagination Hook 示例
        </h1>

        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '24px',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => handleTabChange('client')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: activeTab === 'client' ? '#667eea' : '#e0e0e0',
              color: activeTab === 'client' ? '#fff' : '#333',
              transition: 'all 0.3s'
            }}
          >
            🖥️ 客户端分页
          </button>
          <button
            onClick={() => handleTabChange('server')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: activeTab === 'server' ? '#667eea' : '#e0e0e0',
              color: activeTab === 'server' ? '#fff' : '#333',
              transition: 'all 0.3s'
            }}
          >
            🌐 服务端分页
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="搜索用户名称或邮箱..."
            value={filterText}
            onChange={handleFilterWithReset}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
        </div>

        {activeTab === 'client' ? (
          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              marginBottom: '20px', 
              fontSize: '24px', 
              color: '#333',
              borderBottom: '2px solid #667eea',
              paddingBottom: '12px'
            }}>
              客户端分页演示
            </h2>

            <div style={{ 
              marginBottom: '16px', 
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#667eea' }}>总记录数：</strong>
                  <span style={{ marginLeft: '8px', fontSize: '18px' }}>{filteredUsers.length}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>每页显示：</span>
                  <select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    {[5, 10, 20, 50].map(size => (
                      <option key={size} value={size}>{size} 条/页</option>
                    ))}
                  </select>
                  <button
                    onClick={resetPagination}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6c757d',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    重置
                  </button>
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gap: '12px',
              marginBottom: '24px'
            }}>
              {paginatedUsers.map(user => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '2px solid #e0e0e0'
            }}>
              <div style={{ color: '#666', fontSize: '14px' }}>
                {paginationInfo.showing}
              </div>

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

              <div style={{ color: '#666', fontSize: '14px' }}>
                {paginationInfo.pageRange}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              marginBottom: '20px', 
              fontSize: '24px', 
              color: '#333',
              borderBottom: '2px solid #667eea',
              paddingBottom: '12px'
            }}>
              服务端分页演示
            </h2>

            <div style={{ 
              marginBottom: '16px', 
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#667eea' }}>总记录数：</strong>
                  <span style={{ marginLeft: '8px', fontSize: '18px' }}>{serverTotal}</span>
                  {isLoading && <span style={{ marginLeft: '16px', color: '#666' }}>加载中...</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>每页显示：</span>
                  <select
                    value={serverPageSize}
                    onChange={handleServerPageSizeChange}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    {[10, 20, 50, 100].map(size => (
                      <option key={size} value={size}>{size} 条/页</option>
                    ))}
                  </select>
                  <button
                    onClick={serverRefresh}
                    disabled={isLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: isLoading ? '#6c757d' : '#667eea',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    刷新
                  </button>
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gap: '12px',
              marginBottom: '24px',
              minHeight: '300px'
            }}>
              {isLoading ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px',
                  color: '#666',
                  fontSize: '18px'
                }}>
                  ⏳ 正在加载数据...
                </div>
              ) : serverData.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px',
                  color: '#999',
                  fontSize: '18px'
                }}>
                  😔 没有找到匹配的数据
                </div>
              ) : (
                serverData.map(user => (
                  <UserCard key={user.id} user={user} />
                ))
              )}
            </div>

            {!isLoading && serverData.length > 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginTop: '24px',
                paddingTop: '24px',
                borderTop: '2px solid #e0e0e0'
              }}>
                <div style={{ color: '#666', fontSize: '14px' }}>
                  第 {serverPage} 页，共 {serverTotalPages || 0} 页
                </div>

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

                <div style={{ color: '#666', fontSize: '14px' }}>
                  第 {serverPage} / {serverTotalPages || 0} 页
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ 
          marginTop: '32px',
          padding: '24px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ 
            marginBottom: '16px', 
            fontSize: '20px', 
            color: '#333',
            borderBottom: '2px solid #667eea',
            paddingBottom: '12px'
          }}>
            📚 Hook API 说明
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gap: '16px',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <div>
              <h4 style={{ color: '#667eea', marginBottom: '8px' }}>usePagination Hook</h4>
              <p style={{ color: '#666', marginBottom: '12px' }}>
                用于客户端分页管理，适用于数据已经全部加载到前端的场景。
              </p>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '13px'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>核心属性：</strong>
                </div>
                <div style={{ marginLeft: '16px' }}>
                  <div>• currentPage: 当前页码</div>
                  <div>• pageSize: 每页条数</div>
                  <div>• totalPages: 总页数</div>
                  <div>• startIndex / endIndex: 当前页数据范围</div>
                  <div>• visiblePages: 可视页码数组</div>
                </div>
                <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                  <strong>核心方法：</strong>
                </div>
                <div style={{ marginLeft: '16px' }}>
                  <div>• goToPage(page): 跳转到指定页</div>
                  <div>• nextPage() / previousPage(): 下一页/上一页</div>
                  <div>• setPageSize(size): 设置每页条数</div>
                  <div>• resetPagination(): 重置分页状态</div>
                  <div>• getPaginationInfo(): 获取分页信息文本</div>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ color: '#667eea', marginBottom: '8px' }}>useServerPagination Hook</h4>
              <p style={{ color: '#666', marginBottom: '12px' }}>
                用于服务端分页管理，适用于数据需要从服务器分页获取的场景。
              </p>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '13px'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>额外属性：</strong>
                </div>
                <div style={{ marginLeft: '16px' }}>
                  <div>• data: 当前页数据</div>
                  <div>• totalItems: 总记录数</div>
                  <div>• isLoading: 加载状态</div>
                  <div>• error: 错误信息</div>
                  <div>• refresh(): 刷新数据</div>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ color: '#667eea', marginBottom: '8px' }}>配置选项</h4>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '13px'
              }}>
                <div>• initialPage: 初始页码 (默认: 1)</div>
                <div>• initialPageSize: 初始每页条数 (默认: 10)</div>
                <div>• pageSizeOptions: 每页条数选项 (默认: [10, 20, 50, 100])</div>
                <div>• maxPageButtons: 最多显示页码按钮数 (默认: 7)</div>
                <div>• syncToUrl: 是否同步到URL参数 (默认: false)</div>
                <div>• urlParamName: URL参数名称 (默认: 'page')</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaginationExample;
