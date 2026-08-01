import React, { useState, useCallback, useMemo } from 'react';
import { VirtualList, InfiniteLoaderList } from './VirtualList';
import { Button } from './ui/shadcn';
import { Card, CardContent, CardHeader, CardTitle } from './ui/shadcn';
import { Badge } from './ui/shadcn';

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

  const getRoleBadgeVariant = (role: string): 'error' | 'warning' | 'success' | 'secondary' => {
    switch (role) {
      case '管理员': return 'error';
      case '编辑': return 'warning';
      case '普通用户': return 'success';
      default: return 'secondary';
    }
  };

  const renderUserCard = useCallback((item: DataItem) => {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-primary-500 mb-2 mr-2 flex justify-between items-center">
        <div>
          <div className="font-semibold text-base text-gray-700">
            {item.name}
          </div>
          <div className="text-gray-500 text-sm mt-1">
            {item.email}
          </div>
          <div className="text-gray-400 text-xs mt-1">
            创建时间: {new Date(item.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <Badge variant={getRoleBadgeVariant(item.role)}>
            {item.role}
          </Badge>
          <Badge variant={item.status === 'active' ? 'success' : 'error'}>
            {item.status === 'active' ? '活跃' : '停用'}
          </Badge>
        </div>
      </div>
    );
  }, []);

  const memoizedRenderItem = useMemo(() => renderUserCard, [renderUserCard]);

  return (
    <div className="p-10 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-8 text-3xl font-bold text-gray-900 text-center">
          🚀 VirtualList 虚拟列表示例
        </h1>

        <div className="flex gap-4 mb-6 justify-center flex-wrap">
          <Button
            onClick={() => setActiveTab('basic')}
            variant={activeTab === 'basic' ? 'default' : 'outline'}
            className={activeTab === 'basic' ? 'bg-primary-500 hover:bg-primary-600' : ''}
          >
            📋 基础虚拟列表
          </Button>
          <Button
            onClick={() => setActiveTab('infinite')}
            variant={activeTab === 'infinite' ? 'default' : 'outline'}
            className={activeTab === 'infinite' ? 'bg-primary-500 hover:bg-primary-600' : ''}
          >
            ♾️ 无限加载列表
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800 border-b-2 border-primary-500 pb-3">
              {activeTab === 'basic' ? '基础虚拟列表演示' : '无限加载列表演示'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-4 p-4 bg-gray-50 rounded-lg flex gap-3 items-center flex-wrap">
              <span className="text-primary-500 font-semibold">数据量：</span>
              {[100, 500, 1000, 5000, 10000].map(size => (
                <Button
                  key={size}
                  onClick={() => handleDataSizeChange(size)}
                  variant={dataSize === size ? 'default' : 'outline'}
                  size="sm"
                  className={dataSize === size ? 'bg-primary-500 hover:bg-primary-600' : ''}
                >
                  {size.toLocaleString()} 条
                </Button>
              ))}
            </div>

            <div className="p-4 bg-blue-50 rounded-lg mb-4 border-l-4 border-blue-500">
              <div className="font-semibold text-blue-600 mb-2">💡 性能提示：</div>
              <div className="text-gray-600 text-sm leading-relaxed">
                {activeTab === 'basic' 
                  ? `当前列表包含 ${dataSize.toLocaleString()} 条数据。使用虚拟列表，只渲染可见区域的项目，大大提升渲染性能！`
                  : '无限加载列表会在滚动到底部时自动加载更多数据，无需分页！'
                }
              </div>
              <div className="mt-2 text-xs text-gray-400">
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
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
                  <div className="text-center py-5 text-gray-500">
                    🎉 已加载全部数据！
                  </div>
                }
                emptyText="暂无数据"
              />
            )}
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800 border-b-2 border-primary-500 pb-3">
              📚 组件 API 说明
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-6 text-sm leading-relaxed">
              <div>
                <h4 className="text-primary-500 mb-3 font-semibold">VirtualList Props</h4>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs">
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
                <h4 className="text-primary-500 mb-3 font-semibold">InfiniteLoaderList Props</h4>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs">
                  <div>• loadMore: () =&gt; Promise&lt;void&gt; - 加载更多数据函数</div>
                  <div>• hasMore: boolean - 是否还有更多数据</div>
                  <div>• isLoading: boolean - 当前是否正在加载</div>
                  <div>• endComponent?: ReactNode - 加载完毕后的提示组件</div>
                  <div>（其他Props与VirtualList相同）</div>
                </div>
              </div>

              <div>
                <h4 className="text-primary-500 mb-3 font-semibold">使用场景</h4>
                <div className="bg-gray-50 p-4 rounded-lg text-sm">
                  <div>✅ 大数据量列表（1000+ 条数据）</div>
                  <div>✅ 无限滚动列表（社交媒体、电商商品列表）</div>
                  <div>✅ 下载/上传历史记录</div>
                  <div>✅ 文件列表</div>
                  <div>✅ 搜索结果列表</div>
                  <div>✅ 任何需要渲染大量数据的场景</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VirtualListExample;