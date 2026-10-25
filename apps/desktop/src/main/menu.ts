import { app, Menu, shell, dialog } from 'electron';
import { showMainWindow, showAdminWindow } from './windows.js';
import { config } from './config.js';

export function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template: any = [
    // { role: 'appMenu' }
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ]
      : []),
    // { role: 'fileMenu' }
    {
      label: '文件',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit', label: '退出' }
      ]
    },
    // { role: 'editMenu' }
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle', label: '粘贴并匹配样式' },
              { role: 'delete', label: '删除' },
              { role: 'selectAll', label: '全选' },
              { type: 'separator' },
              {
                label: '演讲',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }]
              }
            ]
          : [
              { role: 'delete', label: '删除' },
              { type: 'separator' },
              { role: 'selectAll', label: '全选' }
            ])
      ]
    },
    // { role: 'viewMenu' }
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '强制刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏切换' }
      ]
    },
    // { role: 'windowMenu' }
    {
      label: '窗口',
      submenu: [
        {
          label: '显示主界面',
          accelerator: 'CmdOrCtrl+1',
          click: () => showMainWindow()
        },
        {
          label: '显示管理控制台',
          accelerator: 'CmdOrCtrl+2',
          click: () => showAdminWindow()
        },
        { type: 'separator' },
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close', label: '关闭窗口' }])
      ]
    },
    {
      role: 'help',
      label: '帮助',
      submenu: [
        {
          label: '项目主页',
          click: async () => {
            await shell.openExternal('https://github.com/trae-ide/download-manager');
          }
        },
        { type: 'separator' },
        {
          label: '关于 DM Download Manager',
          click: () => {
            dialog.showMessageBox({
              title: '关于',
              message: 'DM Download Manager',
              detail: `版本: ${config.shell.version}\n引擎版本: v3.1.0-core\n基于 Electron 32.3.3 构建\n\n© 2026 TRAE Superpowers Team`,
              buttons: ['确定'],
              type: 'info'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
