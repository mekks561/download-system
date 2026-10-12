import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth.routes';
import downloadRoutes from './routes/download.routes';
import uploadRoutes from './routes/upload.routes';
import fileRoutes from './routes/file.routes';
import healthRoutes from './routes/health.routes';
import shareRoutes from './routes/share.routes';
import scheduleRoutes from './routes/schedule.routes';
import statsRoutes from './routes/stats.routes';
import gmRoutes from './routes/gm.routes';
import aiRoutes from './routes/ai.routes';
import pluginsRoutes from './routes/plugins.routes';

export const app = express();
// 反向代理后正确获取客户端 IP（限流依赖真实 IP）
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.use(express.json());
// 全局限流：100 次/分钟/IP，防止接口滥用与 DoS
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后再试' },
      timestamp: new Date().toISOString(),
    },
  }),
);
app.use('/api/auth', authRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/gm', gmRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/plugins', pluginsRoutes);

// Swagger UI：读取 gen:openapi 产物（openapi.json），挂载于 /docs。
// 文件缺失（如极简部署未拷贝）或损坏（非法 JSON）时静默跳过并告警，
// 不影响 API 本体启动。注意：helmet 默认 CSP 会拦截 Swagger UI 的内联
// 初始化脚本/样式，需在同一挂载点覆盖为允许 inline 的 CSP（后设置的同名响应头覆盖前者）。
const openapiPath = join(process.cwd(), 'openapi.json');
if (existsSync(openapiPath)) {
  try {
    const openapiDocument = JSON.parse(readFileSync(openapiPath, 'utf-8')) as object;
    app.use(
      '/docs',
      helmet.contentSecurityPolicy({
        useDefaults: true,
        directives: {
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
          'font-src': ["'self'", 'data:'],
          'worker-src': ["'self'", 'blob:'],
        },
      }),
      swaggerUi.serve,
      swaggerUi.setup(openapiDocument, {
        customSiteTitle: 'Download Manager API',
        customCss: '.topbar { display: none; }',
      }),
    );
  } catch (err) {
    console.warn('[docs] openapi.json 解析失败，跳过 Swagger UI 挂载:', err);
  }
}

app.use(errorHandler);
