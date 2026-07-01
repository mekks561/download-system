# Changelog

All notable changes to this project will be documented in this file.

## [2.5.0] - 2026-06-10

### ✨ 新增功能

1. **批量下载功能**
   - 支持同时添加多个下载链接
   - 提供可展开的批量URL输入界面
   - 自动提取文件名或使用默认命名

2. **虚拟滚动优化**
   - 使用 react-window 实现虚拟滚动
   - 支持高效渲染大量下载任务（1000+）
   - 显著提升列表滚动流畅度

3. **深色模式支持**
   - 完整的深色主题实现
   - 支持亮色、深色、跟随系统三种模式
   - 主题状态持久化到 localStorage

4. **下载队列优先级**
   - 支持四种优先级：urgent、high、normal、low
   - 支持动态修改优先级
   - 支持按优先级排序下载

5. **即时操作反馈**
   - Toast 和 Notification 集成
   - 统一的反馈服务管理

### 🔧 优化改进

1. **断点续传优化**
   - 增强断点续传稳定性
   - 添加服务器断点续传支持检测
   - 优化 HTTP Range 请求处理

2. **网络重试机制**
   - 实现指数退避重试策略
   - 最大重试次数：3次
   - 支持可配置的重试延迟

3. **Safari 浏览器兼容**
   - 完善 Safari 浏览器下载支持
   - 针对 Desktop Safari 和 iOS Safari 提供不同方案

4. **性能优化**
   - 状态更新节流优化（100ms）
   - 使用 useMemo 缓存统计数据
   - 防止重复通知发送

### 🐛 修复的问题

1. **BUG-001** - 下载任务列表卡顿问题
   - 优化状态更新频率
   - 减少不必要的重渲染

2. **TypeScript 类型错误修复**
   - 修复 NotificationItem 接口命名冲突
   - 修复 Input 组件缺少的 props
   - 修复数值输入的类型不匹配

3. **下载队列管理问题**
   - 修复 AbortController 处理问题
   - 确保取消请求时正确清理资源

### 📁 修改的文件

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `src/types/index.ts` | 修改 | 添加 Priority 类型 |
| `src/hooks/useDownloadManager.ts` | 修改 | 添加批量下载、优先级管理 |
| `src/hooks/useTheme.ts` | 新建 | 主题管理 Hook |
| `src/services/DownloadService.ts` | 修改 | 断点续传增强 |
| `src/services/NetworkService.ts` | 新建 | 统一网络服务 |
| `src/services/FeedbackService.ts` | 新建 | 统一反馈服务 |
| `src/utils/SafariDownload.ts` | 新建 | Safari 下载兼容工具 |
| `src/components/VirtualDownloadList.tsx` | 新建 | 虚拟滚动列表组件 |
| `src/components/PerformanceTest.tsx` | 新建 | 性能测试工具组件 |
| `src/pages/Downloads.tsx` | 修改 | 集成虚拟滚动和性能测试 |
| `src/App.css` | 修改 | 添加性能测试组件样式 |
| `package.json` | 修改 | 更新版本号到 2.5.0 |

### 🚀 性能测试结果

| 测试场景 | 优化前 | 优化后 |
|---------|--------|--------|
| 100 条数据 | 流畅 | 流畅 |
| 500 条数据 | 轻微卡顿 | 流畅 |
| 1000 条数据 | 严重卡顿 | 流畅滚动 |

### 📝 使用说明

1. **性能测试**：点击下载页面的"⚡ 性能测试"按钮，可添加模拟数据验证虚拟滚动效果
2. **深色模式**：在设置页面切换主题模式
3. **批量下载**：点击"批量下载"按钮，输入多个 URL（每行一个）
4. **优先级设置**：在下载任务上右键或通过操作菜单设置优先级

---

## [0.1.0] - 初始版本

- 基础下载管理功能
- 断点续传支持
- 基本 UI 界面