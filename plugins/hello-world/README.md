# Hello World Plugin

Download Manager v3.1.0 的参考 MVP 插件。

## 功能

- 在主界面注册一个 "Say Hello" 菜单项（点击弹出宿主通知）
- 监听 `download:complete` 事件并记录文件名

## 工作方式

- 类型：`ui`
- 运行环境：`worker_threads` 沙箱（由 apps/api 的 PluginHost + SandboxRunner 装载）
- 入口：`index.js`
- 权限声明：`{ type: 'ui', inject: ['menu'] }`

## 与宿主的通信

worker 内不直接持有宿主对象（函数无法跨线程传递）。`ctx.host.*` 与
`ctx.register*` 全部是代理，调用以 `host-call` 消息转发给宿主；宿主事件
（广播）与菜单点击（invoke）也以消息送达本插件。协议细节见
`apps/api/src/plugins/SandboxRunner.ts` 头注释。

## 手动安装（开发）

```bash
cp -r plugins/hello-world/ <userData>/plugins/hello-world/
# 编辑 <userData>/plugins/installed.json（参考 plugins/installed.example.json）：
#   { "hello-world": { "version": "1.0.0", "path": "hello-world/", "enabled": true, ... } }
```

重启 Download Manager 后，日志应出现：

```
[hello-world] Hello World plugin activated
[PluginHost] hello-world 注册菜单: Say Hello
```
