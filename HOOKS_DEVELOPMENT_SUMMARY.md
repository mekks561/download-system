# React Hooks 开发总结

## 概述

本项目为下载管理系统开发了多个功能完善的React Hooks，包括分页管理、模态框管理等功能，提升了应用的组件化水平和代码复用性。

## 已完成的 Hooks

### 1. usePagination Hook（分页管理）

**文件位置：** `src/hooks/usePagination.ts`

#### 功能特性

- **客户端分页**：`usePagination` 适用于数据已全部加载到前端的场景
- **服务端分页**：`useServerPagination` 适用于需要从服务器分页获取数据的场景
- **智能页码显示**：支持显示部分页码（如 1 ... 4 5 6 ... 10）
- **URL同步**：可选的URL参数同步功能，支持浏览器前进后退
- **无障碍访问**：支持键盘导航和焦点管理
- **丰富的配置选项**：可自定义每页条数、初始页码、显示按钮数量等

#### API

```typescript
// usePagination Hook
const {
  currentPage,      // 当前页码
  pageSize,         // 每页条数
  totalPages,       // 总页数
  totalItems,       // 总记录数
  startIndex,       // 当前页起始索引
  endIndex,         // 当前页结束索引
  hasNextPage,      // 是否有下一页
  hasPreviousPage,  // 是否有上一页
  isFirstPage,      // 是否第一页
  isLastPage,       // 是否最后一页
  pageNumbers,       // 所有页码数组
  visiblePages,      // 可视页码数组（带省略号）
  goToPage,         // 跳转到指定页
  nextPage,         // 下一页
  previousPage,     // 上一页
  firstPage,        // 首页
  lastPage,         // 末页
  setPageSize,      // 设置每页条数
  resetPagination,  // 重置分页状态
  getPaginationInfo // 获取分页信息文本
} = usePagination({
  totalItems: 100,
  initialPage: 1,
  initialPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
  maxPageButtons: 7,
  syncToUrl: false,
  urlParamName: 'page'
});

// useServerPagination Hook
const {
  data,             // 当前页数据
  totalItems,       // 总记录数
  isLoading,        // 加载状态
  error,            // 错误信息
  refresh,          // 刷新数据
  // ... 其他分页方法同 usePagination
} = useServerPagination({
  fetchData: async (page, pageSize) => {
    const response = await api.getData({ page, pageSize });
    return {
      data: response.items,
      total: response.total
    };
  }
});
```

#### 使用示例

```tsx
import { usePagination } from './hooks/usePagination';

function UserList() {
  const [users, setUsers] = useState([]); // 假设已有用户数据
  
  const {
    currentPage,
    pageSize,
    visiblePages,
    goToPage,
    nextPage,
    previousPage
  } = usePagination({
    totalItems: users.length
  });

  const paginatedUsers = users.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div>
      <ul>
        {paginatedUsers.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
      
      <div className="pagination">
        <button onClick={previousPage} disabled={currentPage === 1}>
          上一页
        </button>
        
        {visiblePages.map((page, index) => (
          page === -1 ? (
            <span key={`ellipsis-${index}`}>...</span>
          ) : (
            <button
              key={page}
              onClick={() => goToPage(page)}
              className={currentPage === page ? 'active' : ''}
            >
              {page}
            </button>
          )
        ))}
        
        <button onClick={nextPage}>
          下一页
        </button>
      </div>
    </div>
  );
}
```

### 2. useModal Hook（模态框管理）

**文件位置：** `src/hooks/useModal.ts`

#### 功能特性

- **基础模态框**：`useModal` 提供完整的模态框状态管理
- **确认对话框**：`useConfirmDialog` 用于需要用户确认的操作
- **输入框**：`usePrompt` 用于需要用户输入的场景
- **多模态框管理**：`useMultipleModals` 支持同时管理多个模态框
- **动画支持**：内置打开/关闭动画
- **无障碍访问**：
  - 焦点捕获和循环
  - ESC键关闭
  - 点击遮罩关闭（可配置）
  - 滚动锁定
  - 焦点恢复

#### API

```typescript
// useModal Hook
const {
  isOpen,           // 是否打开
  isClosing,        // 是否正在关闭
  open,             // 打开模态框
  close,            // 关闭模态框
  toggle,           // 切换打开状态
  modalRef,         // 模态框DOM引用
  overlayRef        // 遮罩DOM引用
} = useModal({
  defaultOpen: false,
  closeOnOverlayClick: true,
  closeOnEscape: true,
  preventScroll: true,
  trapFocus: true,
  onOpen: () => console.log('Modal opened'),
  onClose: () => console.log('Modal closed')
});

// useConfirmDialog Hook
const {
  dialog,           // 对话框配置
  isOpen,           // 是否打开
  isLoading,        // 加载状态
  confirm           // 显示确认对话框，返回Promise<boolean>
} = useConfirmDialog();

// 使用示例
const confirmed = await confirm({
  title: '确认删除',
  message: '确定要删除这个项目吗？',
  confirmText: '删除',
  cancelText: '取消',
  confirmVariant: 'danger', // 'primary' | 'danger' | 'warning'
  onConfirm: async () => {
    await deleteItem(id);
  },
  onCancel: () => {
    console.log('User cancelled');
  }
});

// usePrompt Hook
const {
  prompt,           // 提示框配置（用于显示）
  isOpen,           // 是否打开
  value,            // 输入值
  setValue,         // 设置输入值
  showPrompt,       // 显示输入框
  handleSubmit,     // 提交处理
  handleCancel      // 取消处理
} = usePrompt();

// 使用示例
const inputValue = await showPrompt({
  title: '请输入名称',
  message: '请输入新的项目名称：',
  defaultValue: '',
  placeholder: '输入名称...',
  validate: (value) => {
    if (!value.trim()) return '名称不能为空';
    if (value.length < 2) return '名称至少需要2个字符';
    return null; // 返回null表示验证通过
  },
  onSubmit: (value) => {
    console.log('Submitted:', value);
  },
  onCancel: () => {
    console.log('Cancelled');
  }
});

// useMultipleModals Hook
const {
  openModals,       // 已打开的模态框集合
  open,             // 打开指定模态框
  close,            // 关闭指定模态框
  toggle,           // 切换指定模态框
  closeAll,         // 关闭所有模态框
  isOpen            // 检查指定模态框是否打开
} = useMultipleModals(['modal1', 'modal2', 'modal3']);
```

#### 使用示例

```tsx
import { useModal, useConfirmDialog, usePrompt } from './hooks/useModal';

function App() {
  // 基础模态框
  const modal = useModal();
  
  // 确认对话框
  const confirm = useConfirmDialog();
  
  // 输入框
  const prompt = usePrompt();
  
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: '确认删除',
      message: '确定要删除这个项目吗？',
      confirmVariant: 'danger',
      onConfirm: async () => {
        await deleteItem();
      }
    });
    
    if (confirmed) {
      console.log('Item deleted');
    }
  };
  
  const handleRename = async () => {
    const newName = await prompt.showPrompt({
      title: '重命名',
      message: '请输入新的名称：',
      validate: (value) => {
        if (!value.trim()) return '名称不能为空';
        return null;
      },
      onSubmit: (value) => {
        console.log('New name:', value);
      }
    });
  };
  
  return (
    <div>
      <button onClick={modal.open}>打开模态框</button>
      <button onClick={handleDelete}>删除</button>
      <button onClick={handleRename}>重命名</button>
      
      {/* 自定义模态框内容 */}
      {modal.isOpen && (
        <div className="modal-overlay" onClick={modal.close}>
          <div className="modal" ref={modal.modalRef} onClick={e => e.stopPropagation()}>
            <h2>模态框标题</h2>
            <p>模态框内容</p>
            <button onClick={modal.close}>关闭</button>
          </div>
        </div>
      )}
      
      {/* 确认对话框 */}
      {confirm.isOpen && confirm.dialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h2>{confirm.dialog.title}</h2>
            <p>{confirm.dialog.message}</p>
            <button onClick={confirm.handleCancel}>
              {confirm.dialog.cancelText}
            </button>
            <button onClick={confirm.handleConfirm} disabled={confirm.isLoading}>
              {confirm.isLoading ? '处理中...' : confirm.dialog.confirmText}
            </button>
          </div>
        </div>
      )}
      
      {/* 输入框 */}
      {prompt.isOpen && prompt.prompt && (
        <div className="prompt-overlay">
          <div className="prompt">
            <h2>{prompt.prompt.title}</h2>
            {prompt.prompt.message && <p>{prompt.prompt.message}</p>}
            <input
              value={prompt.value}
              onChange={(e) => prompt.setValue(e.target.value)}
              placeholder={prompt.prompt.placeholder}
            />
            <div className="actions">
              <button onClick={prompt.handleCancel}>取消</button>
              <button onClick={prompt.handleSubmit}>确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 已创建的示例页面

1. **usePagination 示例**：`src/components/usePaginationExample.tsx`
   - 客户端分页演示
   - 服务端分页演示
   - 搜索过滤集成
   - 分页信息显示
   - 动态每页条数切换

2. **useModal 示例**：`src/components/useModalExample.tsx`
   - 多个基础模态框
   - 确认对话框（普通、危险、警告）
   - 输入框演示
   - 操作日志
   - 模态框状态管理

## 测试覆盖

为新创建的 Hooks 编写了完整的单元测试：

- `src/hooks/__tests__/usePagination.test.tsx`
  - 默认值初始化
  - 页码导航
  - 页数边界处理
  - 每页条数切换
  - 重置功能
  - 索引计算
  - 分页信息生成
  - 服务端分页

- `src/hooks/__tests__/useModal.test.tsx`
  - 打开/关闭状态管理
  - 确认对话框
  - 输入框
  - 多模态框管理
  - 回调函数测试

## 文件结构

```
src/
├── hooks/
│   ├── index.ts                                    # Hooks 导出索引
│   ├── usePagination.ts                           # 分页管理 Hook
│   ├── useModal.ts                                # 模态框管理 Hook
│   └── __tests__/
│       ├── usePagination.test.tsx                # 分页 Hook 测试
│       └── useModal.test.tsx                     # 模态框 Hook 测试
└── components/
    ├── index.ts                                   # 组件导出索引
    ├── usePaginationExample.tsx                  # 分页 Hook 示例
    └── useModalExample.tsx                       # 模态框 Hook 示例
```

## 关键特性

### 1. TypeScript 支持
- 完整的类型定义
- 接口和类型导出
- 严格的类型检查

### 2. 性能优化
- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存回调函数
- 避免不必要的重渲染

### 3. 无障碍访问（a11y）
- 焦点捕获和循环
- 键盘导航支持
- ARIA 属性支持
- 焦点恢复

### 4. 灵活性
- 丰富的配置选项
- 可选的回调函数
- 可扩展的架构

### 5. 用户体验
- 流畅的动画过渡
- 加载状态提示
- 错误处理
- 禁用状态管理

## 集成到项目

所有 Hooks 都可以通过 `src/hooks/index.ts` 统一导入：

```typescript
import {
  usePagination,
  useServerPagination,
  useModal,
  useConfirmDialog,
  usePrompt,
  useMultipleModals
} from './hooks';
```

## 下一步建议

1. **使用新 Hooks**：在现有组件中集成这些 Hooks，替换手写的状态管理代码

2. **扩展功能**：
   - 添加更多动画效果
   - 支持拖拽排序
   - 添加更多表单验证规则
   - 支持自定义主题

3. **文档完善**：
   - 为现有组件添加JSDoc注释
   - 创建更多使用示例
   - 编写集成指南

4. **性能监控**：
   - 添加性能指标收集
   - 监控重渲染次数
   - 优化大数据量场景

5. **测试增强**：
   - 增加集成测试
   - 添加用户交互测试
   - 覆盖更多边界情况

## 总结

本次开发的 Hooks 为下载管理系统提供了强大的基础设施支持，使得分页管理和模态框交互变得更加简单和一致。这些 Hooks 遵循 React 最佳实践，具有良好的类型安全性、可测试性和可维护性，能够显著提升开发效率和代码质量。
