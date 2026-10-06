import 'dotenv/config';
import { app } from './app';
import { getGmJwtSecret } from './middleware/gm-auth';

// fail-fast：生产环境缺独立 GM_JWT_SECRET 时直接拒绝启动（开发环境允许临时密钥并告警）。
// 放到监听端口前，避免「服务已起、GM 登录一律失败」的带病运行。
getGmJwtSecret();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app };
