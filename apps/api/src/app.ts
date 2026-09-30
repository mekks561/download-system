import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
app.use(errorHandler);
