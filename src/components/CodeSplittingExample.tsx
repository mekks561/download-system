import React, { useState, useEffect } from 'react';
import { Button } from './ui/shadcn';
import { Card, CardContent, CardHeader, CardTitle } from './ui/shadcn';

const SimpleStatsDashboard = () => (
  <div className="p-10 text-center">
    <div className="text-5xl mb-5">📊</div>
    <h2 className="mb-4 text-xl font-bold text-gray-900">数据仪表板</h2>
    <p className="text-gray-500">这是一个按需加载的重型组件</p>
    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gradient-to-br from-primary-500 to-purple-600 p-6 rounded-xl text-white">
          <div className="text-3xl font-bold">1,234</div>
          <div className="text-sm opacity-90">统计数据 {i}</div>
        </div>
      ))}
    </div>
  </div>
);

const SimpleNotificationPanel = () => (
  <div className="p-10 text-center">
    <div className="text-5xl mb-5">🔔</div>
    <h2 className="mb-4 text-xl font-bold text-gray-900">通知中心</h2>
    <p className="text-gray-500">这是一个按需加载的通知组件</p>
    <div className="mt-8 text-left">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 mb-3 bg-gray-50 rounded-lg border-l-4 border-primary-500">
          <div className="font-semibold text-gray-700">通知 {i}</div>
          <div className="text-sm text-gray-500">这是一条示例通知消息</div>
        </div>
      ))}
    </div>
  </div>
);

const SimpleSettingsPanel = () => (
  <div className="p-10 text-center">
    <div className="text-5xl mb-5">⚙️</div>
    <h2 className="mb-4 text-xl font-bold text-gray-900">设置中心</h2>
    <p className="text-gray-500">这是一个按需加载的设置组件</p>
    <div className="mt-8 text-left max-w-md mx-auto">
      {['选项 A', '选项 B', '选项 C'].map((opt, index) => (
        <div key={opt} className="p-4 mb-3 bg-gray-50 rounded-lg flex justify-between items-center">
          <span className="text-gray-700">{opt}</span>
          <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${index === 0 ? 'bg-primary-500' : 'bg-gray-300'}`}>
            <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all duration-300 ${index === 0 ? 'left-4' : 'left-0.5'}`} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const componentMap = {
  dashboard: SimpleStatsDashboard,
  notifications: SimpleNotificationPanel,
  settings: SimpleSettingsPanel
};

const CodeSplittingExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loadTimes, setLoadTimes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [loadedComponents, setLoadedComponents] = useState<string[]>(['dashboard']);

  useEffect(() => {
    if (!loadedComponents.includes(activeTab)) {
      setLoading(true);
      const startTime = performance.now();
      const timer = setTimeout(() => {
        const endTime = performance.now();
        setLoadTimes(prev => ({
          ...prev,
          [activeTab]: Math.round(endTime - startTime)
        }));
        setLoadedComponents(prev => [...prev, activeTab]);
        setLoading(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [activeTab, loadedComponents]);

  const ComponentToRender = componentMap[activeTab as keyof typeof componentMap];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-12 text-center bg-gray-50 rounded-lg">
          <div className="text-5xl mb-4">⏳</div>
          <div className="text-lg text-gray-500">正在加载组件...</div>
        </div>
      );
    }
    return <ComponentToRender />;
  };

  return (
    <div className="p-10 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="mb-8 text-3xl font-bold text-gray-900 text-center">
          📦 Code Splitting 代码分割示例
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-gray-800 border-b-2 border-primary-500 pb-3">
                💡 什么是代码分割？
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-gray-600 leading-relaxed mb-4">
                代码分割是React应用性能优化的重要技术，它允许我们将代码库拆分成多个小块，
                按需加载，而不是一次性加载整个应用。
              </p>
              <div className="bg-gray-50 p-4 rounded-lg text-sm leading-relaxed">
                <div className="mb-2 font-semibold">主要优势：</div>
                <div className="ml-4">
                  <div>✅ <strong>减少首屏加载时间</strong> - 只加载当前需要的代码</div>
                  <div>✅ <strong>优化用户体验</strong> - 应用启动更快</div>
                  <div>✅ <strong>节省带宽</strong> - 用户只下载他们需要的代码</div>
                  <div>✅ <strong>更好的缓存</strong> - 独立的代码块可以独立缓存</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-gray-800 border-b-2 border-primary-500 pb-3">
                🔧 如何使用？
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs leading-relaxed">
                <div className="mb-3 text-primary-500 font-semibold">
                  1. 使用 React.lazy() 导入组件
                </div>
                <div className="mb-3 text-gray-600 pl-4">
                  <div className="mb-1">const HeavyComponent =</div>
                  <div className="pl-4">React.lazy(() =&gt;</div>
                  <div className="pl-8">import('./HeavyComponent')</div>
                  <div className="pl-4">);</div>
                </div>
                <div className="mb-3 text-primary-500 font-semibold">
                  2. 使用 Suspense 包裹
                </div>
                <div className="pl-4 text-gray-600">
                  <div className="mb-1">&lt;Suspense fallback=</div>
                  <div className="pl-4">&lt;Loading /&gt;&gt;</div>
                  <div className="pl-4">&lt;HeavyComponent /&gt;</div>
                  <div className="pl-4">&lt;/Suspense&gt;</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800 border-b-2 border-primary-500 pb-3">
              📊 性能对比
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-4 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => setActiveTab('dashboard')}
                variant={activeTab === 'dashboard' ? 'default' : 'outline'}
                className={`w-full ${activeTab === 'dashboard' ? 'bg-primary-500 hover:bg-primary-600' : ''}`}
              >
                📊 数据仪表板
              </Button>
              <Button
                onClick={() => setActiveTab('notifications')}
                variant={activeTab === 'notifications' ? 'default' : 'outline'}
                className={`w-full ${activeTab === 'notifications' ? 'bg-primary-500 hover:bg-primary-600' : ''}`}
              >
                🔔 通知中心
              </Button>
              <Button
                onClick={() => setActiveTab('settings')}
                variant={activeTab === 'settings' ? 'default' : 'outline'}
                className={`w-full ${activeTab === 'settings' ? 'bg-primary-500 hover:bg-primary-600' : ''}`}
              >
                ⚙️ 设置中心
              </Button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="font-semibold text-blue-600 mb-2">💡 性能监控：</div>
              <div className="text-gray-600 text-sm">
                当前加载的组件：<strong>{activeTab === 'dashboard' ? '数据仪表板' : activeTab === 'notifications' ? '通知中心' : '设置中心'}</strong>
                {loadTimes[activeTab] && (
                  <span className="ml-4">
                    加载时间：<strong>{loadTimes[activeTab]}ms</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="min-h-[400px]">
              {renderContent()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-gray-800 border-b-2 border-primary-500 pb-3">
              📚 代码分割策略
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 text-sm leading-relaxed">
              <div>
                <h3 className="text-primary-500 mb-2 font-semibold">1. 路由级分割</h3>
                <div className="bg-gray-50 p-3 rounded-lg mb-2">
                  <strong>使用场景：</strong>不同页面/路由的组件
                </div>
                <div className="text-gray-600 pl-4">
                  在React Router中，为每个路由组件使用React.lazy()，用户访问时才加载对应页面
                </div>
              </div>

              <div>
                <h3 className="text-primary-500 mb-2 font-semibold">2. 组件级分割</h3>
                <div className="bg-gray-50 p-3 rounded-lg mb-2">
                  <strong>使用场景：</strong>大型组件库、图表库、编辑器等
                </div>
                <div className="text-gray-600 pl-4">
                  将不常用的重型组件（如富文本编辑器、数据可视化图表）进行代码分割
                </div>
              </div>

              <div>
                <h3 className="text-primary-500 mb-2 font-semibold">3. 条件级分割</h3>
                <div className="bg-gray-50 p-3 rounded-lg mb-2">
                  <strong>使用场景：</strong>模态框、弹出层、高级功能等
                </div>
                <div className="text-gray-600 pl-4">
                  根据用户交互（如点击按钮）动态加载组件，只有用户需要时才加载
                </div>
              </div>

              <div>
                <h3 className="text-primary-500 mb-2 font-semibold">4. 预加载策略</h3>
                <div className="bg-gray-50 p-3 rounded-lg mb-2">
                  <strong>使用场景：</strong>预测用户下一步操作
                </div>
                <div className="text-gray-600 pl-4">
                  在用户hover或即将需要时提前加载组件，使用preload()或React.lazy()配合预加载
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CodeSplittingExample;