import 'dotenv/config';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { writeFileSync } from 'fs';
import {
  DownloadSchema, DownloadCreateSchema,
  UserResponseSchema, UserCreateSchema, LoginSchema,
  UploadSchema, FileSchema, ShareSchema, ShareCreateSchema,
  ScheduleSchema, ScheduleCreateSchema,
} from '@dm/shared';

// zod v4 原生 .meta({ id }) 用于声明 OpenAPI 命名组件引用。
// 无需 extendZodWithOpenApi：zod v4 的 ZodObject 不再经原型链继承 ZodType，
// 原型扩展无效；zod-to-openapi v9 通过 schema.meta().id 识别引用。
const DownloadRef = DownloadSchema.meta({ id: 'Download' });
const UploadRef = UploadSchema.meta({ id: 'Upload' });
const FileRef = FileSchema.meta({ id: 'File' });
const ShareRef = ShareSchema.meta({ id: 'Share' });
const ScheduleRef = ScheduleSchema.meta({ id: 'Schedule' });
const UserRef = UserResponseSchema.meta({ id: 'User' });

const registry = new OpenAPIRegistry();

// Auth 路径
registry.registerPath({
  method: 'post', path: '/api/auth/register',
  request: { body: { content: { 'application/json': { schema: UserCreateSchema } } } },
  responses: { 201: { description: '注册成功', content: { 'application/json': { schema: UserRef } } } },
});
registry.registerPath({
  method: 'post', path: '/api/auth/login',
  request: { body: { content: { 'application/json': { schema: LoginSchema } } } },
  responses: { 200: { description: '登录成功' } },
});

// Download 路径
registry.registerPath({
  method: 'get', path: '/api/downloads',
  responses: { 200: { description: '下载列表', content: { 'application/json': { schema: DownloadRef.array() } } } },
});
registry.registerPath({
  method: 'post', path: '/api/downloads',
  request: { body: { content: { 'application/json': { schema: DownloadCreateSchema } } } },
  responses: { 201: { description: '创建成功', content: { 'application/json': { schema: DownloadRef } } } },
});

// Upload 路径
registry.registerPath({
  method: 'get', path: '/api/uploads',
  responses: { 200: { description: '上传列表', content: { 'application/json': { schema: UploadRef.array() } } } },
});

// File 路径
registry.registerPath({
  method: 'get', path: '/api/files',
  responses: { 200: { description: '文件列表', content: { 'application/json': { schema: FileRef.array() } } } },
});

// Share 路径
registry.registerPath({
  method: 'post', path: '/api/shares',
  request: { body: { content: { 'application/json': { schema: ShareCreateSchema } } } },
  responses: { 201: { description: '创建分享', content: { 'application/json': { schema: ShareRef } } } },
});

// Schedule 路径
registry.registerPath({
  method: 'post', path: '/api/schedules',
  request: { body: { content: { 'application/json': { schema: ScheduleCreateSchema } } } },
  responses: { 201: { description: '创建调度', content: { 'application/json': { schema: ScheduleRef } } } },
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const openapi = generator.generateDocument({
  openapi: '3.0.0',
  info: { title: 'Download Manager API', version: '3.0.0' },
});
writeFileSync('openapi.json', JSON.stringify(openapi, null, 2));
console.log('openapi.json 已生成');
