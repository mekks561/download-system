import React, { useState, useEffect } from 'react';

// 创建简单的示例组件用于代码分割演示
const SimpleStatsDashboard = () => (
  <div style={{ padding: '40px', textAlign: 'center' }}>
    <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
    <h2 style={{ marginBottom: '16px', color: '#1a1a2e' }}>数据仪表板</h2>
    <p style={{ color: '#6b7280' }}>这是一个按需加载的重型组件</p>
    <div style={{ 
      marginTop: '32px',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px'
    }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '24px',
          borderRadius: '12px',
          color: '#fff'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>1,234</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>统计数据 {i}</div>
        </div>
      ))}
    </div>
  </div>
);

const SimpleNotificationPanel = () => (
  <div style={{ padding: '40px', textAlign: 'center' }}>
    <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔔</div>
    <h2 style={{ marginBottom: '16px', color: '#1a1a2e' }}>通知中心</h2>
    <p style={{ color: '#6b7280' }}>这是一个按需加载的通知组件</p>
    <div style={{ marginTop: '32px', textAlign: 'left' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ 
          padding: '16px',
          marginBottom: '12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          borderLeft: '4px solid #667eea'
        }}>
          <div style={{ fontWeight: '600', color: '#333' }}>通知 {i}</div>
          <div style={{ fontSize: '14px', color: '#666' }}>这是一条示例通知消息</div>
        </div>
      ))}
    </div>
  </div>
);

const SimpleSettingsPanel = () => (
  <div style={{ padding: '40px', textAlign: 'center' }}>
    <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚙️</div>
    <h2 style={{ marginBottom: '16px', color: '#1a1a2e' }}>设置中心</h2>
    <p style={{ color: '#6b7280' }}>这是一个按需加载的设置组件</p>
    <div style={{ marginTop: '32px', textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
      {['选项 A', '选项 B', '选项 C'].map((opt, i) => (
        <div key={i} style={{ 
          padding: '16px',
          marginBottom: '12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{opt}</span>
          <div style={{
            width: '40px',
            height: '24px',
            backgroundColor: i === 0 ? '#667eea' : '#ddd',
            borderRadius: '12px',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              width: '20px',
              height: '20px',
              backgroundColor: '#fff',
              borderRadius: '50%',
              top: '2px',
              left: i === 0 ? '18px' : '2px',
              transition: 'all 0.3s'
            }} />
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
        <div style={{ 
          padding: '60px', 
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '18px', color: '#666' }}>正在加载组件...</div>
        </div>
      );
    }
    return <ComponentToRender />;
  };

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
          📦 Code Splitting 代码分割示例
        </h1>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              marginBottom: '20px', 
              fontSize: '20px', 
              color: '#333',
              borderBottom: '2px solid #667eea',
              paddingBottom: '12px'
            }}>
              💡 什么是代码分割？
            </h2>
            <p style={{ color: '#666', lineHeight: '1.8', marginBottom: '16px' }}>
              代码分割是React应用性能优化的重要技术，它允许我们将代码库拆分成多个小块，
              按需加载，而不是一次性加载整个应用。
            </p>
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '16px', 
              borderRadius: '8px',
              fontSize: '14px',
              lineHeight: '1.8'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>主要优势：</strong>
              </div>
              <div style={{ marginLeft: '16px' }}>
                <div>✅ <strong>减少首屏加载时间</strong> - 只加载当前需要的代码</div>
                <div>✅ <strong>优化用户体验</strong> - 应用启动更快</div>
                <div>✅ <strong>节省带宽</strong> - 用户只下载他们需要的代码</div>
                <div>✅ <strong>更好的缓存</strong> - 独立的代码块可以独立缓存</div>
              </div>
            </div>
          </div>

          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              marginBottom: '20px', 
              fontSize: '20px', 
              color: '#333',
              borderBottom: '2px solid #667eea',
              paddingBottom: '12px'
            }}>
              🔧 如何使用？
            </h2>
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '16px', 
              borderRadius: '8px',
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '13px',
              lineHeight: '1.8'
            }}>
              <div style={{ marginBottom: '12px', color: '#667eea', fontWeight: '600' }}>
                1. 使用 React.lazy() 导入组件
              </div>
              <div style={{ marginBottom: '12px', color: '#666', paddingLeft: '16px' }}>
                <div style={{ marginBottom: '4px' }}>const HeavyComponent =</div>
                <div style={{ marginLeft: '16px' }}>React.lazy(() =&gt;</div>
                <div style={{ marginLeft: '32px' }}>import('./HeavyComponent')</div>
                <div style={{ marginLeft: '16px' }}>);</div>
              </div>
              <div style={{ marginBottom: '12px', color: '#667eea', fontWeight: '600' }}>
                2. 使用 Suspense 包裹
              </div>
              <div style={{ marginLeft: '16px', color: '#666' }}>
                <div style={{ marginBottom: '4px' }}>&lt;Suspense fallback=</div>
                <div style={{ marginLeft: '16px' }}>&lt;Loading /&gt;&gt;</div>
                <div style={{ marginLeft: '16px' }}>&lt;HeavyComponent /&gt;</div>
                <div style={{ marginLeft: '16px' }}>&lt;/Suspense&gt;</div>
              </div>
            </div>
          </div>
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
            fontSize: '20px', 
            color: '#333',
            borderBottom: '2px solid #667eea',
            paddingBottom: '12px'
          }}>
            📊 性能对比
          </h2>
          
          <div style={{ 
            marginBottom: '16px', 
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px'
          }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                padding: '12px 20px',
                backgroundColor: activeTab === 'dashboard' ? '#667eea' : '#e0e0e0',
                color: activeTab === 'dashboard' ? '#fff' : '#333',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              📊 数据仪表板
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              style={{
                padding: '12px 20px',
                backgroundColor: activeTab === 'notifications' ? '#667eea' : '#e0e0e0',
                color: activeTab === 'notifications' ? '#fff' : '#333',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              🔔 通知中心
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                padding: '12px 20px',
                backgroundColor: activeTab === 'settings' ? '#667eea' : '#e0e0e0',
                color: activeTab === 'settings' ? '#fff' : '#333',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              ⚙️ 设置中心
            </button>
          </div>

          <div style={{ 
            marginBottom: '16px', 
            padding: '16px',
            backgroundColor: '#e6f7ff',
            borderRadius: '8px',
            borderLeft: '4px solid #1890ff'
          }}>
            <div style={{ fontWeight: '600', color: '#1890ff', marginBottom: '8px' }}>
              💡 性能监控：
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>
              当前加载的组件：<strong>{activeTab === 'dashboard' ? '数据仪表板' : activeTab === 'notifications' ? '通知中心' : '设置中心'}</strong>
              {loadTimes[activeTab] && (
                <span style={{ marginLeft: '16px' }}>
                  加载时间：<strong>{loadTimes[activeTab]}ms</strong>
                </span>
              )}
            </div>
          </div>

          <div style={{ minHeight: '400px' }}>
            {renderContent()}
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#fff', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            marginBottom: '16px', 
            fontSize: '20px', 
            color: '#333',
            borderBottom: '2px solid #667eea',
            paddingBottom: '12px'
          }}>
            📚 代码分割策略
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gap: '16px',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <div>
              <h3 style={{ color: '#667eea', marginBottom: '8px' }}>1. 路由级分割</h3>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '8px',
                marginBottom: '8px'
              }}>
                <strong>使用场景：</strong>不同页面/路由的组件
              </div>
              <div style={{ color: '#666', paddingLeft: '16px' }}>
                在React Router中，为每个路由组件使用React.lazy()，用户访问时才加载对应页面
              </div>
            </div>

            <div>
              <h3 style={{ color: '#667eea', marginBottom: '8px' }}>2. 组件级分割</h3>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '8px',
                marginBottom: '8px'
              }}>
                <strong>使用场景：</strong>大型组件库、图表库、编辑器等
              </div>
              <div style={{ color: '#666', paddingLeft: '16px' }}>
                将不常用的重型组件（如富文本编辑器、数据可视化图表）进行代码分割
              </div>
            </div>

            <div>
              <h3 style={{ color: '#667eea', marginBottom: '8px' }}>3. 条件级分割</h3>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '8px',
                marginBottom: '8px'
              }}>
                <strong>使用场景：</strong>模态框、弹出层、高级功能等
              </div>
              <div style={{ color: '#666', paddingLeft: '16px' }}>
                根据用户交互（如点击按钮）动态加载组件，只有用户需要时才加载
              </div>
            </div>

            <div>
              <h3 style={{ color: '#667eea', marginBottom: '8px' }}>4. 预加载策略</h3>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '12px', 
                borderRadius: '8px',
                marginBottom: '8px'
              }}>
                <strong>使用场景：</strong>预测用户下一步操作
              </div>
              <div style={{ color: '#666', paddingLeft: '16px' }}>
                在用户hover或即将需要时提前加载组件，使用preload()或React.lazy()配合预加载
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeSplittingExample;
