import 'dotenv/config';
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { openApiDocumentJson } from './openapi/build-document.js';

// 文档构造逻辑全部在 build-document.ts（无副作用、可被测试直接 import）；
// 本文件只负责落盘。产物路径对两种调用方式保持一致：
// - pnpm --filter api gen:openapi（cwd = apps/api）
// - 在仓库根直接执行（cwd = 仓库根）
const candidates = [
  join(process.cwd(), 'openapi.json'),
  join(process.cwd(), 'apps', 'api', 'openapi.json'),
];
const outPath = candidates.find((p) => existsSync(p)) ?? candidates[0];

writeFileSync(outPath, openApiDocumentJson());
console.log(`openapi.json 已生成: ${outPath}`);
