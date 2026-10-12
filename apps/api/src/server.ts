import 'dotenv/config';
import path from 'node:path';
import { app } from './app';
import { getGmJwtSecret } from './middleware/gm-auth';
import { PluginHost } from './plugins/PluginHost';
import { resolvePluginsDir } from './plugins/paths';

// fail-fast：生产环境缺独立 GM_JWT_SECRET 时直接拒绝启动（开发环境允许临时密钥并告警）。
// 放到监听端口前，避免「服务已起、GM 登录一律失败」的带病运行。
getGmJwtSecret();

// S4 插件系统：启动时可选装载本地插件（installed.json 缺失/目录缺失时为空注册表）。
// loadAll 对单插件失败自捕获并标记 error；整体失败也只告警，不阻断 API 启动
// （插件宿主是增强能力，不是关键路径）。
const pluginsDir = resolvePluginsDir();
const pluginHost = new PluginHost({
  pluginsDir,
  installedJsonPath: path.join(pluginsDir, 'installed.json'),
});
void pluginHost.loadAll().catch((err) => {
  console.warn('[PluginHost] 插件装载失败（不影响 API 启动）:', err);
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app };
