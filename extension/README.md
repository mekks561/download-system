# Download Manager Helper Extension

📥 浏览器扩展，快速将页面链接添加到下载管理系统

## 功能特性

- 🏠 **添加当前页面** - 一键将当前页面添加到下载管理器
- 🔗 **添加选中链接** - 选中页面中的链接后快速添加
- 🖱️ **右键菜单** - 通过右键菜单直接添加链接或页面
- ⌨️ **快捷键支持** - `Ctrl+Shift+D` 添加当前页面，`Ctrl+Shift+L` 添加选中链接
- 🔍 **智能链接检测** - 自动识别可下载文件链接，鼠标悬停显示添加按钮
- 📥 **自动添加** - 可选自动将浏览器下载添加到管理器

## 安装步骤

### Chrome / Edge 浏览器

1. 打开浏览器，访问 `chrome://extensions/` 或 `edge://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `extension` 文件夹
5. 扩展安装完成！

### Firefox 浏览器

1. 打开浏览器，访问 `about:debugging#/runtime/this-firefox`
2. 点击「临时加载附加组件」
3. 选择 `extension/manifest.json` 文件
4. 扩展安装完成（重启浏览器后需要重新加载）

## 使用方法

### 基本使用

1. 点击浏览器工具栏中的 📥 图标打开弹出窗口
2. 首次使用需要输入 API Token（在下载管理系统中获取）
3. 登录后即可使用各项功能

### 快捷键

- `Ctrl+Shift+D` / `Command+Shift+D` - 添加当前页面到下载管理器
- `Ctrl+Shift+L` / `Command+Shift+L` - 添加选中的链接到下载管理器

### 右键菜单

- 在链接上右键 → 选择「添加链接到下载管理器」
- 在页面空白处右键 → 选择「添加当前页面到下载管理器」

### 智能链接检测

在任意网页上，当鼠标悬停在可下载文件链接上时，会显示一个粉色的 📥 按钮，点击即可快速添加到下载管理器。

## 配置说明

### API Token 获取

1. 打开下载管理系统（http://localhost:3000）
2. 登录您的账户
3. 在个人设置或安全设置中找到 API Token
4. 复制 Token 并粘贴到扩展的登录页面

### 自动添加浏览器下载

在扩展弹出窗口中，开启「自动添加浏览器下载」开关，当您通过浏览器下载文件时，会自动将下载链接添加到下载管理系统。

## 开发说明

### 项目结构

```
extension/
├── manifest.json    # 扩展配置文件（Manifest V3）
├── background.js    # 后台服务工作者
├── content.js       # 内容脚本（注入到网页）
├── popup.html       # 弹出窗口 HTML
├── popup.js         # 弹出窗口 JavaScript
└── icons/           # 图标资源
    ├── icon16.svg
    ├── icon32.svg
    ├── icon48.svg
    ├── icon128.svg
    └── generate-icons.ps1
```

### 技术栈

- Manifest V3
- 原生 JavaScript（ES6+）
- 萌系 UI 设计（粉色渐变主题）

### 本地开发

1. 确保后端服务运行在 http://localhost:5001
2. 确保前端应用运行在 http://localhost:3000
3. 按照安装步骤加载扩展
4. 修改代码后，在扩展管理页面点击「刷新」按钮重新加载

## 支持的文件类型

扩展会自动识别以下文件类型的链接：

- 压缩文件: `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.bz2`
- 安装包: `.exe`, `.msi`, `.dmg`, `.apk`
- 文档: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`
- 音视频: `.mp3`, `.mp4`, `.avi`, `.mkv`, `.mov`, `.flv`, `.wmv`
- 图片: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.svg`
- 光盘镜像: `.iso`, `.img`, `.bin`
- 种子文件: `.torrent`
- 电子书: `.epub`, `.mobi`, `.azw`
- 数据文件: `.json`, `.xml`, `.csv`, `.txt`
- 包管理器: `.deb`, `.rpm`, `.pkg`, `.sh`, `.bat`

## 注意事项

- 扩展仅在本地开发环境使用，连接地址为 http://localhost:5001 和 http://localhost:3000
- 请确保后端服务已启动并运行正常
- API Token 需要定期更新，过期后需要重新登录
- 建议在开发完成后，在生产环境中修改为正式域名

## 许可证

MIT License
