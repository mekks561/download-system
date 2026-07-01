import React, { useState, useCallback, useMemo } from 'react';
import { VirtualList, InfiniteLoaderList } from './VirtualList';

interface DataItem {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

const generateMockData = (count: number): DataItem[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `用户 ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: ['管理员', '编辑', '普通用户', '访客'][i % 4],
    status: i % 5 === 0 ? 'inactive' : 'active',
    createdAt: new Date(2024, 0, 1 + (i % 365)).toISOString()
  }));
};

const VirtualListExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'basic' | 'infinite'>('basic');
  const [dataSize, setDataSize] = useState<number>(1000);
  const [items, setItems] = useState<DataItem[]>(() => generateMockData(dataSize));
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadMoreItems = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newItems = generateMockData(100);
    setItems(prev => [...prev, ...newItems]);
    
    if (items.length + 100 >= 5000) {
      setHasMore(false);
    }
    
    setIsLoading(false);
  }, [isLoading, hasMore, items.length]);

  const handleDataSizeChange = useCallback((size: number) => {
    setDataSize(size);
    setItems(generateMockData(size));
    setHasMore(true);
  }, []);

  const renderUserCard = useCallback((item: DataItem) => {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          borderLeft: '4px solid #667eea',
          marginBottom: '8px',
          marginRight: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontWeight: '600', fontSize: '16px', color: '#333' }}>
            {item.name}
          </div>
          <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
            {item.email}
          </div>
          <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
            创建时间: {new Date(item.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{
            padding: '4px 12px',
            backgroundColor: item.role === '管理员' ? '#dc3545' : item.role === '编辑' ? '#ffc107' : item.role === '访客' ? '#6c757d' : '#28a745',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {item.role}
          </span>
          <span style={{
            padding: '4px 12px',
            backgroundColor: item.status === 'active' ? '#28a745' : '#dc3545',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {item.status === 'active' ? '活跃' : '停用'}
          </span>
        </div>
      </div>
    );
  }, []);

  const memoizedRenderItem = useMemo(() => renderUserCard, [renderUserCard]);

  return (
    <div style={{ 
      padding: '40px', 
      backgroundColor: '#f5f5f5', 
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ 
          marginBottom: '32px', 
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#1a1a2e',
          textAlign: 'center'
        }}>
          🚀 VirtualList 虚拟列表示例
        </h1>

        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '24px',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => setActiveTab('basic')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: activeTab === 'basic' ? '#667eea' : '#e0e0e0',
              color: activeTab === 'basic' ? '#fff' : '#333',
              transition: 'all 0.3s'
            }}
          >
            📋 基础虚拟列表
          </button>
          <button
            onClick={() => setActiveTab('infinite')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: activeTab === 'infinite' ? '#667eea' : '#e0e0e0',
              color: activeTab === 'infinite' ? '#fff' : '#333',
              transition: 'all 0.3s'
            }}
          >
            ♾️ 无限加载列表
          </button>
        </div>

        <div style={{ 
          backgroundColor: '#fff', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h2 style={{ 
            marginBottom: '20px', 
            fontSize: '24px', 
            color: '#333',
            borderBottom: '2px solid #667eea',
            paddingBottom: '12px'
          }}>
            {activeTab === 'basic' ? '基础虚拟列表演示' : '无限加载列表演示'}
          </h2>

          <div style={{ 
            marginBottom: '16px', 
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <span style={{ color: '#667eea', fontWeight: '600' }}>数据量：</span>
            {[100, 500, 1000, 5000, 10000].map(size => (
              <button
                key={size}
                onClick={() => handleDataSizeChange(size)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: dataSize === size ? '#667eea' : '#e0e0e0',
                  color: dataSize === size ? '#fff' : '#333',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {size.toLocaleString()} 条
              </button>
            ))}
          </div>

          <div style={{ 
            padding: '16px',
            backgroundColor: '#e6f7ff',
            borderRadius: '8px',
            marginBottom: '16px',
            borderLeft: '4px solid #1890ff'
          }}>
            <div style={{ fontWeight: '600', color: '#1890ff', marginBottom: '8px' }}>
              💡 性能提示：
            </div>
            <div style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
              {activeTab === 'basic' 
                ? `当前列表包含 ${dataSize.toLocaleString()} 条数据。使用虚拟列表，只渲染可见区域的项目，大大提升渲染性能！`
                : '无限加载列表会在滚动到底部时自动加载更多数据，无需分页！'
              }
            </div>
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#999' }}>
              <strong>性能对比：</strong>
              {activeTab === 'basic' && (
                <>
                  传统列表：渲染 {dataSize.toLocaleString()} 个 DOM 节点 | 
                  虚拟列表：仅渲染 ~{Math.ceil(400 / 72) * 2} 个 DOM 节点
                  （提升 ~{Math.round((1 - (Math.ceil(400 / 72) * 2) / dataSize) * 100)}% 性能）
                </>
              )}
              {activeTab === 'infinite' && (
                <>
                  自动加载下一页数据，无需手动翻页
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#fff', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {activeTab === 'basic' ? (
            <VirtualList
              items={items}
              height={600}
              itemHeight={100}
              renderItem={memoizedRenderItem}
              overscanCount={5}
              emptyText="暂无用户数据"
            />
          ) : (
            <InfiniteLoaderList
              items={items}
              loadMore={loadMoreItems}
              hasMore={hasMore}
              isLoading={isLoading}
              height={600}
              itemHeight={100}
              renderItem={memoizedRenderItem}
              overscanCount={5}
              _endComponent={
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  🎉 已加载全部数据！
                </div>
              }
              emptyText="暂无数据"
            />
          )}
        </div>

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
            📚 组件 API 说明
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gap: '24px',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <div>
              <h4 style={{ color: '#667eea', marginBottom: '12px' }}>VirtualList Props</h4>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '13px'
              }}>
                <div>• items: T[] - 数据列表</div>
                <div>• height: number | string - 列表容器高度</div>
                <div>• itemHeight: number - 每个列表项的高度（像素）</div>
                <div>• renderItem: (item, index) =&gt; ReactNode - 渲染函数</div>
                <div>• overscanCount?: number - 额外渲染的项目数（默认3）</div>
                <div>• onScroll?: (offset) =&gt; void - 滚动回调</div>
                <div>• loading?: boolean - 加载状态</div>
                <div>• emptyText?: string - 空状态文本</div>
              </div>
            </div>

            <div>
              <h4 style={{ color: '#667eea', marginBottom: '12px' }}>InfiniteLoaderList Props</h4>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '13px'
              }}>
                <div>• loadMore: () =&gt; Promise&lt;void&gt; - 加载更多数据函数</div>
                <div>• hasMore: boolean - 是否还有更多数据</div>
                <div>• isLoading: boolean - 当前是否正在加载</div>
                <div>• endComponent?: ReactNode - 加载完毕后的提示组件</div>
                <div>（其他Props与VirtualList相同）</div>
              </div>
            </div>

            <div>
              <h4 style={{ color: '#667eea', marginBottom: '12px' }}>使用场景</h4>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                <div>✅ 大数据量列表（1000+ 条数据）</div>
                <div>✅ 无限滚动列表（社交媒体、电商商品列表）</div>
                <div>✅ 下载/上传历史记录</div>
                <div>✅ 文件列表</div>
                <div>✅ 搜索结果列表</div>
                <div>✅ 任何需要渲染大量数据的场景</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualListExample;
