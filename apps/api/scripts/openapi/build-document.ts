/**
 * OpenAPI 文档单一构造源（S3 Task 3）。
 *
 * 设计约束：
 * - 本模块**无副作用**（不读盘、不写盘、不依赖 Prisma/DB），gen-openapi.ts CLI
 *   与 vitest 幂等回归测试共用同一个 `buildOpenApiDocument()`，杜绝「文档与测试各写一份」。
 * - 所有 2xx 响应统一表达为 success 信封 `{ success: true, data, timestamp }`，
 *   与 middleware/error.ts 的 ApiError 信封对称。
 * - 路由清单必须与 src/routes/*.routes.ts 实际注册一致；openapi-routes.test.ts
 *   会遍历 Express app 双向比对，新增端点漏注册会直接红。
 *
 * 元数据写法：统一使用 zod v4 原生 `schema.meta({ id })`（不要调用
 * extendZodWithOpenApi + registry.register(id, schema)）——tsx/vitest 下
 * packages/shared 以 TS 源码加载，其 zod ESM 副本与 api 侧的 CJS 副本类身份不同，
 * 原型扩展无法覆盖 shared 构造出的 schema；.meta() 则是实例自带能力，无此问题。
 */
import { z } from 'zod';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import {
  // 实体（wire 形态）
  DownloadSchema,
  UploadSchema,
  FileSchema,
  ShareSchema,
  ScheduleSchema,
  ScheduleLogSchema,
  ActivitySchema,
  UserResponseSchema,
  // auth DTO
  UserCreateSchema,
  LoginSchema,
  UserUpdateSchema,
  ChangePasswordSchema,
  DeleteAccountSchema,
  // download DTO
  DownloadCreateSchema,
  DownloadUpdateSchema,
  // file DTO
  FileCreateFolderSchema,
  FileRenameSchema,
  FileMoveSchema,
  // share DTO
  ShareCreateSchema,
  ShareUpdateSchema,
  // schedule DTO
  ScheduleCreateSchema,
  ScheduleUpdateSchema,
  // onboarding
  OnboardingStep2Schema,
  OnboardingStep3Schema,
  OnboardingStatusSchema,
  OnboardingSetupResultSchema,
  OnboardingSkipResultSchema,
  // gm（S3 Task 4 B-lite：独立 gm_users / 独立 GM JWT）
  GmLoginSchema,
  GmResetPasswordSchema,
  GmUserUpdateSchema,
  // 信封
  ApiErrorSchema,
} from '@dm/shared';

const JSON_MEDIA = 'application/json';

// ---------------------------------------------------------------
// 公共组件：信封 / 安全 / 错误响应
// ---------------------------------------------------------------

/** 通用成功信封（具体端点在 responses 内联 data 类型；本组件提供统一契约说明） */
const ApiSuccessEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  timestamp: z.string().datetime(),
});

/** DELETE 类端点的 data：{ success: true } */
const SuccessDataSchema = z.object({ success: z.literal(true) });

const HealthDataSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
});

const DownloadStatsDataSchema = z.object({
  totalDownloads: z.number().int().nonnegative(),
  completedDownloads: z.number().int().nonnegative(),
  failedDownloads: z.number().int().nonnegative(),
  totalSize: z.number().int().nonnegative(),
  downloadedSize: z.number().int().nonnegative(),
});

const DeletedDataSchema = z.object({ deleted: z.number().int().nonnegative() });

// stats（service 返回形态，暂无 shared schema，在此声明文档契约）
const StatsOverviewDataSchema = z.object({
  downloads: z.object({
    total: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    totalBytes: z.number().int().nonnegative(),
    completionRate: z.number().min(0).max(100),
  }),
  uploads: z.object({
    total: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    totalBytes: z.number().int().nonnegative(),
    completionRate: z.number().min(0).max(100),
  }),
  shares: z.object({ total: z.number().int().nonnegative() }),
  storage: z.object({
    used: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
});

const TrendPointSchema = z.object({
  date: z.string().min(1),
  downloads: z.number().int().nonnegative(),
  uploads: z.number().int().nonnegative(),
});

const FileTypeStatSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  count: z.number().int().nonnegative(),
  totalSize: z.number().int().nonnegative(),
  color: z.string().min(1),
});

const ActivityStatSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(['download', 'upload']),
  filename: z.string(),
  status: z.string(),
  createdAt: z.string().datetime(),
  size: z.number().int().nonnegative(),
});

// gm 后台（S3 Task 4 B-lite：独立 gm_users + 独立 GM JWT）
const GmDashboardDataSchema = z.object({
  userCount: z.number().int().nonnegative(),
  downloadCount: z.number().int().nonnegative(),
  uploadCount: z.number().int().nonnegative(),
  fileCount: z.number().int().nonnegative(),
  dailyDownloads: z.array(
    z.object({
      date: z.string().min(1),
      downloads: z.number().int().nonnegative(),
    }),
  ),
});

const GmPrincipalShapeSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(1),
  role: z.string().min(1),
});

// AI（请求 schema 与 src/routes/ai.routes.ts 内联定义保持一致；
// 返回体统一 { configured, result }，未配置 Key 时 result 可为 null）
const AiSearchItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    filename: z.string().max(512).optional(),
    url: z.string().max(2048).optional(),
    status: z.string().max(32).optional(),
    category_id: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

const AiClassifyRequestSchema = z.object({
  filename: z.string().min(1).max(512),
  url: z.string().max(2048).optional(),
});

const AiRewriteQueryRequestSchema = z.object({
  query: z.string().min(1).max(512),
});

// 含 AiSearchItem 嵌套的复合请求 schema 在 buildOpenApiDocument() 内基于具名
// item 组件构造，确保 items 元素输出 $ref 而非内联（zod v4 .meta() 返回克隆，
// 不会回写到这里已构造好的模块级实例）。

const AiResultDataSchema = z.object({
  configured: z.boolean(),
  result: z.unknown(),
});

// ---------------------------------------------------------------
// 文档构造
// ---------------------------------------------------------------

/** registry 的 schema 定义条目（register(id,schema) 在 zod v4 双实例下不可用，
 *  未被任何 path 引用的 orphan 组件通过该定义显式注册） */
type SchemaDefinition = { type: 'schema'; schema: z.ZodType };

export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  /** 赋予组件 id（zod v4 原生 meta，生成器据此产出 $ref + components/schemas） */
  const named = <T extends z.ZodType>(id: string, schema: T): T =>
    schema.meta({ id }) as T;

  /** orphan 组件：没有任何 path 直接引用，但契约需要在 /docs 可见 */
  const orphan = <T extends z.ZodType>(id: string, schema: T): T => {
    const withId = named(id, schema);
    (registry as unknown as { _definitions: SchemaDefinition[] })._definitions.push({
      type: 'schema',
      schema: withId,
    });
    return withId;
  };

  // ---- named components：packages/shared 对外 Zod schema 全量注册 ----
  // 实体（wire 形态；UserSchema 含 password 字段属持久化内部模型，不上文档，
  // 对外一律使用 UserResponseSchema 注册为 User）
  const User = named('User', UserResponseSchema);
  const Download = named('Download', DownloadSchema);
  const Upload = named('Upload', UploadSchema);
  const File = named('File', FileSchema);
  const Share = named('Share', ShareSchema);
  const Schedule = named('Schedule', ScheduleSchema);
  const ScheduleLog = named('ScheduleLog', ScheduleLogSchema);
  orphan('Activity', ActivitySchema); // stats 端点返回 ActivityStat 投影，实体本身仍登记

  // auth DTO
  const UserCreate = named('UserCreate', UserCreateSchema);
  const Login = named('Login', LoginSchema);
  const UserUpdate = named('UserUpdate', UserUpdateSchema);
  const ChangePassword = named('ChangePassword', ChangePasswordSchema);
  const DeleteAccount = named('DeleteAccount', DeleteAccountSchema);
  // download DTO
  const DownloadCreate = named('DownloadCreate', DownloadCreateSchema);
  const DownloadUpdate = named('DownloadUpdate', DownloadUpdateSchema);
  // file DTO
  const FileCreateFolder = named('FileCreateFolder', FileCreateFolderSchema);
  const FileRename = named('FileRename', FileRenameSchema);
  const FileMove = named('FileMove', FileMoveSchema);
  // share DTO
  const ShareCreate = named('ShareCreate', ShareCreateSchema);
  const ShareUpdate = named('ShareUpdate', ShareUpdateSchema);
  // schedule DTO
  const ScheduleCreate = named('ScheduleCreate', ScheduleCreateSchema);
  const ScheduleUpdate = named('ScheduleUpdate', ScheduleUpdateSchema);
  // onboarding（S1）
  const OnboardingStep2 = named('OnboardingStep2', OnboardingStep2Schema);
  // Step3 为前端向导配置契约（当前无后端端点直接消费），仍注册以保证 shared 契约可在 /docs 查阅
  orphan('OnboardingStep3', OnboardingStep3Schema);
  const OnboardingStatus = named('OnboardingStatus', OnboardingStatusSchema);
  const OnboardingSetupResult = named('OnboardingSetupResult', OnboardingSetupResultSchema);
  const OnboardingSkipResult = named('OnboardingSkipResult', OnboardingSkipResultSchema);

  // 信封与本服务专属 data 形态。ApiError 仅被下方原生 responses 组件以 $ref 引用
  // （registerComponent 不转换内嵌 zod schema，故必须用 orphan 显式登记 + 字符串 $ref）
  orphan('ApiSuccess', ApiSuccessEnvelopeSchema);
  orphan('ApiError', ApiErrorSchema);
  // 复合结构在 build 内基于具名 User 构造，使 user 字段输出 $ref
  const AuthResult = named(
    'AuthResult',
    z.object({ token: z.string(), user: User }),
  );
  const ProfileData = named('ProfileData', z.object({ user: User }));
  const SuccessData = named('SuccessData', SuccessDataSchema);
  const HealthData = named('HealthData', HealthDataSchema);
  const DownloadStatsData = named('DownloadStats', DownloadStatsDataSchema);
  const DeletedData = named('DeletedData', DeletedDataSchema);
  const StatsOverviewData = named('StatsOverview', StatsOverviewDataSchema);
  const TrendPoint = named('TrendPoint', TrendPointSchema);
  const FileTypeStat = named('FileTypeStat', FileTypeStatSchema);
  const ActivityStat = named('ActivityStat', ActivityStatSchema);
  const GmLogin = named('GmLogin', GmLoginSchema);
  const GmResetPassword = named('GmResetPassword', GmResetPasswordSchema);
  const GmUserUpdate = named('GmUserUpdate', GmUserUpdateSchema);
  const GmDashboardData = named('GmDashboard', GmDashboardDataSchema);
  const GmPrincipal = named('GmPrincipal', GmPrincipalShapeSchema);
  const GmAuthResult = named(
    'GmAuthResult',
    z.object({ token: z.string(), gmUser: GmPrincipal }),
  );
  const GmUserListData = named(
    'GmUserList',
    z.object({
      users: User.array(),
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      pageSize: z.number().int().positive().max(100),
    }),
  );
  const GmDownloadItem = named(
    'GmDownloadItem',
    z.intersection(
      Download,
      z.object({ username: z.string(), email: z.string().email() }),
    ),
  );
  const GmDownloadListData = named(
    'GmDownloadList',
    z.object({
      downloads: GmDownloadItem.array(),
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      pageSize: z.number().int().positive().max(100),
    }),
  );
  const GmCancelResult = named('GmCancelResult', z.object({ download: Download }));
  const GmUploadItem = named(
    'GmUploadItem',
    z.intersection(Upload, z.object({ username: z.string() })),
  );
  // reset-password 成功 data 显式为 null
  const NullData = named('NullData', z.null());
  const AiSearchItem = named('AiSearchItem', AiSearchItemSchema);
  const AiClassifyRequest = named('AiClassifyRequest', AiClassifyRequestSchema);
  const AiRewriteQueryRequest = named('AiRewriteQueryRequest', AiRewriteQueryRequestSchema);
  const AiSemanticSearchRequest = named(
    'AiSemanticSearchRequest',
    z.object({
      query: z.string().min(1).max(512),
      items: z.array(AiSearchItem).max(200),
      topK: z.number().int().min(1).max(50).optional(),
    }),
  );
  const AiSuggestionsRequest = named(
    'AiSuggestionsRequest',
    z.object({
      query: z.string().max(512).default(''),
      recentFiles: z.array(z.string().max(512)).max(50).optional(),
      history: z.array(z.string().max(512)).max(50).optional(),
    }),
  );
  const AiRecommendationsRequest = named(
    'AiRecommendationsRequest',
    z.object({ items: z.array(AiSearchItem).max(100) }),
  );
  const AiResultData = named('AiResult', AiResultDataSchema);

  // ---- 安全方案：Bearer JWT（与 middleware/auth.ts 一致）----
  // 主站与 GM 共用同一 scheme 名，但密钥体系独立：
  // 主站受保护端点验 JWT_SECRET（载荷 {id,role}）；/api/gm/*（除 /auth/login）
  // 验独立 GM_JWT_SECRET（载荷 {id,username,role}，有效期 8h），两类 token 互不通用。
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description:
      '在 Authorization 头携带 `Bearer <token>`；register/login/setup/health 无需令牌。' +
      '主站端点使用 JWT_SECRET 签发的主站 JWT；`/api/gm/*`（除 GM 登录外）必须使用 ' +
      'GM_JWT_SECRET 签发的独立 GM JWT，二者密钥与载荷不同、交叉携带一律 401。',
  });
  const withAuth = [{ bearerAuth: [] }];

  // ---- 公共错误响应（success:false 信封，components/responses 复用）----
  const errorResponse = (description: string) => ({
    description,
    content: {
      [JSON_MEDIA]: { schema: { $ref: '#/components/schemas/ApiError' } },
    },
  });
  const commonErrors = {
    400: { name: 'BadRequest', body: errorResponse('请求参数校验失败（VALIDATION_ERROR）') },
    401: {
      name: 'Unauthorized',
      body: errorResponse(
        '401：缺少/无效令牌（UNAUTHORIZED）、登录凭证错误（主站 UNAUTHORIZED / GM INVALID_CREDENTIALS），' +
          '或账号已被 GM 禁用（ACCOUNT_DISABLED：主站登录与已签发 JWT 的后续请求统一拒绝）',
      ),
    },
    403: { name: 'Forbidden', body: errorResponse('需要管理员权限（FORBIDDEN）') },
    404: { name: 'NotFound', body: errorResponse('资源不存在（NOT_FOUND）') },
    409: { name: 'Conflict', body: errorResponse('状态冲突，如重复初始化（CONFLICT）') },
    429: { name: 'RateLimited', body: errorResponse('触发限流（RATE_LIMITED）') },
  } as const;
  for (const def of Object.values(commonErrors)) {
    registry.registerComponent('responses', def.name, def.body);
  }
  /** 以 $ref 复用公共错误响应，保证 401/429 等形态在全文档一致 */
  const err = (code: keyof typeof commonErrors) => ({
    $ref: `#/components/responses/${commonErrors[code].name}`,
  });

  // ---------------------------------------------------------------
  // helpers：2xx 成功信封 / 参数
  // ---------------------------------------------------------------

  /** 构造成功信封响应：data 为具名组件 schema（信封内联，data 走 $ref） */
  const ok = (data: z.ZodType, description: string, status: 200 | 201 = 200) => ({
    status,
    config: {
      description,
      content: {
        [JSON_MEDIA]: {
          schema: z.object({
            success: z.literal(true),
            data,
            timestamp: z.string().datetime(),
          }),
        },
      },
    },
  });

  const body = (schema: z.ZodType, description = '请求体') => ({
    body: {
      description,
      required: true,
      content: { [JSON_MEDIA]: { schema } },
    },
  });

  const idParam = () => ({
    name: 'id',
    in: 'path' as const,
    required: true,
    description: '资源主键 ID',
    schema: { type: 'integer' as const, minimum: 1 },
  });

  const queryParam = (
    name: string,
    schema: Record<string, unknown>,
    description: string,
  ) => ({ name, in: 'query' as const, required: false, description, schema });

  // 按路由注册；path 顺序即 Swagger UI 展示顺序（components.schemas 由生成器按 key 排序）
  type PathDef = Parameters<OpenAPIRegistry['registerPath']>[0];
  const paths: PathDef[] = [
    // ================= Auth（含 S1 onboarding）=================
    {
      method: 'get',
      path: '/api/auth/setup-status',
      tags: ['Auth'],
      summary: '查询是否需要首次运行初始化',
      description: '公开端点，仅返回布尔 needsSetup，不泄露用户数量。',
      responses: {
        200: ok(OnboardingStatus, '当前初始化状态').config,
        429: err(429),
      },
    },
    {
      method: 'post',
      path: '/api/auth/setup',
      tags: ['Auth'],
      summary: '首次运行创建管理员（完成初始化）',
      description: '仅当 users 表为空时可用；建号即登入，返回 201 + { token, user }。',
      request: body(OnboardingStep2, '管理员账号信息'),
      responses: {
        201: ok(OnboardingSetupResult, '初始化完成（已签发 token）', 201).config,
        400: err(400),
        409: err(409),
        429: err(429),
      },
    },
    {
      method: 'post',
      path: '/api/auth/skip-setup',
      tags: ['Auth'],
      summary: '跳过向导：创建默认管理员',
      description:
        '随机强密码明文仅在本响应出现一次；mustChangePassword 恒为 true。返回 201。',
      responses: {
        201: ok(OnboardingSkipResult, '默认管理员已创建（已签发 token）', 201).config,
        409: err(409),
        429: err(429),
      },
    },
    {
      method: 'post',
      path: '/api/auth/register',
      tags: ['Auth'],
      summary: '注册新用户',
      request: body(UserCreate),
      responses: {
        201: ok(AuthResult, '注册成功并自动登入', 201).config,
        400: err(400),
        409: err(409),
        429: err(429),
      },
    },
    {
      method: 'post',
      path: '/api/auth/login',
      tags: ['Auth'],
      summary: '登录',
      request: body(Login),
      responses: {
        200: ok(AuthResult, '登录成功').config,
        400: err(400),
        401: err(401),
        429: err(429),
      },
    },
    {
      method: 'get',
      path: '/api/auth/profile',
      tags: ['Auth'],
      summary: '获取当前用户资料',
      security: withAuth,
      responses: {
        200: ok(ProfileData, '当前用户资料').config,
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'put',
      path: '/api/auth/profile',
      tags: ['Auth'],
      summary: '更新当前用户资料',
      security: withAuth,
      request: body(UserUpdate, '资料更新白名单：username / email'),
      responses: {
        200: ok(ProfileData, '更新后的用户资料').config,
        400: err(400),
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'post',
      path: '/api/auth/change-password',
      tags: ['Auth'],
      summary: '修改密码',
      security: withAuth,
      request: body(ChangePassword),
      responses: {
        200: ok(SuccessData, '密码已修改').config,
        400: err(400),
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'post',
      path: '/api/auth/logout',
      tags: ['Auth'],
      summary: '登出（前端清除 token；JWT 无状态）',
      security: withAuth,
      responses: {
        200: ok(SuccessData, '已登出').config,
        401: err(401),
      },
    },
    {
      method: 'delete',
      path: '/api/auth/account',
      tags: ['Auth'],
      summary: '注销当前账号（级联清理用户数据）',
      security: withAuth,
      request: body(DeleteAccount, '需再次提供密码确认'),
      responses: {
        200: ok(SuccessData, '账号已注销').config,
        400: err(400),
        401: err(401),
        404: err(404),
      },
    },

    // ================= Downloads =================
    {
      method: 'get',
      path: '/api/downloads',
      tags: ['Downloads'],
      summary: '下载列表',
      security: withAuth,
      responses: {
        200: ok(Download.array(), '当前用户的下载记录').config,
        401: err(401),
      },
    },
    {
      method: 'post',
      path: '/api/downloads',
      tags: ['Downloads'],
      summary: '新建下载任务',
      security: withAuth,
      request: body(DownloadCreate),
      responses: {
        201: ok(Download, '下载任务已创建', 201).config,
        400: err(400),
        401: err(401),
      },
    },
    {
      method: 'get',
      path: '/api/downloads/stats',
      tags: ['Downloads'],
      summary: '下载统计概要',
      security: withAuth,
      responses: {
        200: ok(DownloadStatsData, '下载统计').config,
        401: err(401),
      },
    },
    {
      method: 'delete',
      path: '/api/downloads/completed',
      tags: ['Downloads'],
      summary: '清空已完成的下载记录',
      security: withAuth,
      responses: {
        200: ok(DeletedData, '删除条数').config,
        401: err(401),
      },
    },
    {
      method: 'get',
      path: '/api/downloads/{id}',
      tags: ['Downloads'],
      summary: '查询单条下载',
      security: withAuth,
      parameters: [idParam()],
      responses: {
        200: ok(Download, '下载记录').config,
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'put',
      path: '/api/downloads/{id}',
      tags: ['Downloads'],
      summary: '更新下载（状态/进度白名单）',
      security: withAuth,
      parameters: [idParam()],
      request: body(DownloadUpdate),
      responses: {
        200: ok(Download, '更新后的下载记录').config,
        400: err(400),
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'post',
      path: '/api/downloads/{id}/start',
      tags: ['Downloads'],
      summary: '开始下载',
      security: withAuth,
      parameters: [idParam()],
      responses: {
        200: ok(Download, '已开始').config,
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'post',
      path: '/api/downloads/{id}/pause',
      tags: ['Downloads'],
      summary: '暂停下载',
      security: withAuth,
      parameters: [idParam()],
      responses: {
        200: ok(Download, '已暂停').config,
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'post',
      path: '/api/downloads/{id}/resume',
      tags: ['Downloads'],
      summary: '继续下载',
      security: withAuth,
      parameters: [idParam()],
      responses: {
        200: ok(Download, '已继续').config,
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'post',
      path: '/api/downloads/{id}/cancel',
      tags: ['Downloads'],
      summary: '取消下载',
      security: withAuth,
      parameters: [idParam()],
      responses: {
        200: ok(Download, '已取消').config,
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'delete',
      path: '/api/downloads/{id}',
      tags: ['Downloads'],
      summary: '删除下载记录',
      security: withAuth,
      parameters: [idParam()],
      responses: {
        200: ok(SuccessData, '已删除').config,
        401: err(401),
        404: err(404),
      },
    },

    // ================= Uploads =================
    {
      method: 'get',
      path: '/api/uploads',
      tags: ['Uploads'],
      summary: '上传列表',
      security: withAuth,
      responses: {
        200: ok(Upload.array(), '当前用户的上传记录').config,
        401: err(401),
      },
    },
    {
      method: 'delete',
      path: '/api/uploads/{id}',
      tags: ['Uploads'],
      summary: '删除上传记录',
      security: withAuth,
      parameters: [idParam()],
      responses: {
        200: ok(SuccessData, '已删除').config,
        401: err(401),
        404: err(404),
      },
    },

    // ================= Files =================
    {
      method: 'get',
      path: '/api/files',
      tags: ['Files'],
      summary: '文件列表（按父目录）',
      security: withAuth,
      parameters: [
        queryParam('parentId', { type: 'integer' }, '父目录 ID；不传或空串表示根目录'),
      ],
      responses: {
        200: ok(File.array(), '文件/目录列表').config,
        401: err(401),
      },
    },
    {
      method: 'get',
      path: '/api/files/search',
      tags: ['Files'],
      summary: '搜索文件',
      security: withAuth,
      parameters: [queryParam('q', { type: 'string' }, '搜索关键字')],
      responses: {
        200: ok(File.array(), '命中的文件').config,
        401: err(401),
      },
    },
    {
      method: 'post',
      path: '/api/files/folder',
      tags: ['Files'],
      summary: '新建文件夹',
      security: withAuth,
      request: body(FileCreateFolder),
      responses: {
        201: ok(File, '文件夹已创建', 201).config,
        400: err(400),
        401: err(401),
      },
    },
    {
      method: 'patch',
      path: '/api/files/{id}/rename',
      tags: ['Files'],
      summary: '重命名文件/文件夹',
      security: withAuth,
      parameters: [idParam()],
      request: body(FileRename),
      responses: {
        200: ok(File, '更新后的文件').config,
        400: err(400),
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'patch',
      path: '/api/files/{id}/move',
      tags: ['Files'],
      summary: '移动文件/文件夹',
      security: withAuth,
      parameters: [idParam()],
      request: body(FileMove, '目标父目录；null 表示移动到根目录'),
      responses: {
        200: ok(File, '更新后的文件').config,
        400: err(400),
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'delete',
      path: '/api/files/{id}',
      tags: ['Files'],
      summary: '删除文件/文件夹',
      security: withAuth,
      parameters: [idParam()],
      responses: {
        200: ok(SuccessData, '已删除').config,
        401: err(401),
        404: err(404),
      },
    },

    // ================= Health =================
    {
      method: 'get',
      path: '/api/health',
      tags: ['Health'],
      summary: '健康检查（公开）',
      responses: {
        200: ok(HealthData, '服务存活').config,
      },
    },

    // ================= Shares =================
    {
      method: 'get',
      path: '/api/shares',
      tags: ['Shares'],
      summary: '分享列表',
      security: withAuth,
      responses: {
        200: ok(Share.array(), '当前用户的分享').config,
        401: err(401),
      },
    },
    {
      method: 'post',
      path: '/api/shares',
      tags: ['Shares'],
      summary: '创建分享',
      security: withAuth,
      request: body(ShareCreate),
      responses: {
        201: ok(Share, '分享已创建', 201).config,
        400: err(400),
        401: err(401),
      },
    },
    {
      method: 'patch',
      path: '/api/shares/{id}',
      tags: ['Shares'],
      summary: '更新分享状态',
      security: withAuth,
      parameters: [idParam()],
      request: body(ShareUpdate, '仅允许 status 字段'),
      responses: {
        200: ok(Share, '更新后的分享').config,
        400: err(400),
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'delete',
      path: '/api/shares/{id}',
      tags: ['Shares'],
      summary: '撤销分享',
      security: withAuth,
      parameters: [idParam()],
      responses: {
        200: ok(SuccessData, '已撤销').config,
        401: err(401),
        404: err(404),
      },
    },

    // ================= Schedules =================
    {
      method: 'get',
      path: '/api/schedules',
      tags: ['Schedules'],
      summary: '调度任务列表',
      security: withAuth,
      responses: {
        200: ok(Schedule.array(), '调度任务列表').config,
        401: err(401),
      },
    },
    {
      method: 'post',
      path: '/api/schedules',
      tags: ['Schedules'],
      summary: '创建调度任务',
      security: withAuth,
      request: body(ScheduleCreate),
      responses: {
        201: ok(Schedule, '调度任务已创建', 201).config,
        400: err(400),
        401: err(401),
      },
    },
    {
      method: 'patch',
      path: '/api/schedules/{id}',
      tags: ['Schedules'],
      summary: '更新调度（启用状态 / cron）',
      security: withAuth,
      parameters: [idParam()],
      request: body(ScheduleUpdate),
      responses: {
        200: ok(Schedule, '更新后的调度任务').config,
        400: err(400),
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'delete',
      path: '/api/schedules/{id}',
      tags: ['Schedules'],
      summary: '删除调度任务',
      security: withAuth,
      parameters: [idParam()],
      responses: {
        200: ok(SuccessData, '已删除').config,
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'get',
      path: '/api/schedules/{id}/logs',
      tags: ['Schedules'],
      summary: '调度执行日志',
      security: withAuth,
      parameters: [idParam()],
      responses: {
        200: ok(ScheduleLog.array(), '执行日志列表').config,
        401: err(401),
        404: err(404),
      },
    },

    // ================= Stats =================
    {
      method: 'get',
      path: '/api/stats/overview',
      tags: ['Stats'],
      summary: '概览统计',
      security: withAuth,
      responses: {
        200: ok(StatsOverviewData, '概览统计').config,
        401: err(401),
      },
    },
    {
      method: 'get',
      path: '/api/stats/activities',
      tags: ['Stats'],
      summary: '最近活动',
      security: withAuth,
      parameters: [
        queryParam('limit', { type: 'integer', default: 20, minimum: 1 }, '返回条数，默认 20'),
      ],
      responses: {
        200: ok(ActivityStat.array(), '最近活动').config,
        401: err(401),
      },
    },
    {
      method: 'get',
      path: '/api/stats/trend',
      tags: ['Stats'],
      summary: '下载/上传趋势',
      security: withAuth,
      parameters: [
        queryParam(
          'range',
          { type: 'string', enum: ['today', 'week', 'month'], default: 'week' },
          '时间范围，非法值回退为 week',
        ),
      ],
      responses: {
        200: ok(TrendPoint.array(), '按天聚合的趋势点').config,
        401: err(401),
      },
    },
    {
      method: 'get',
      path: '/api/stats/file-types',
      tags: ['Stats'],
      summary: '文件类型分布',
      security: withAuth,
      responses: {
        200: ok(FileTypeStat.array(), '文件类型分布').config,
        401: err(401),
      },
    },

    // ================= GM（独立 gm_users / 独立 GM JWT）=================
    {
      method: 'post',
      path: '/api/gm/auth/login',
      tags: ['GM'],
      summary: 'GM 管理员登录（独立账号体系，公开）',
      description:
        '凭据校验独立的 gm_users 表，成功签发 8h GM JWT（GM_JWT_SECRET，与主站 JWT 不互通）。' +
        '用户名不存在与密码错误统一返回 401 INVALID_CREDENTIALS；与主站认证共享 10 次/15 分钟限流。',
      request: body(GmLogin, 'GM 用户名 + 密码'),
      responses: {
        200: ok(GmAuthResult, 'GM 登录成功（GM JWT）').config,
        400: err(400),
        401: err(401),
        429: err(429),
      },
    },
    {
      method: 'get',
      path: '/api/gm/dashboard',
      tags: ['GM'],
      summary: '全局仪表盘：四类总数 + 最近 7 天每日下载',
      security: withAuth,
      responses: {
        200: ok(GmDashboardData, '全局计数与 7 天日序列').config,
        401: err(401),
      },
    },
    {
      method: 'get',
      path: '/api/gm/users',
      tags: ['GM'],
      summary: '用户列表（分页 / 搜索 / 角色过滤）',
      security: withAuth,
      parameters: [
        queryParam('search', { type: 'string' }, 'email 或 username 模糊匹配'),
        queryParam('role', { type: 'string', enum: ['user', 'admin'] }, '按主站角色过滤'),
        queryParam('page', { type: 'integer', default: 1, minimum: 1 }, '页码，默认 1'),
        queryParam('pageSize', { type: 'integer', default: 20, minimum: 1, maximum: 100 }, '每页条数，默认 20，上限 100'),
      ],
      responses: {
        200: ok(GmUserListData, '分页用户列表（不含 password）').config,
        400: err(400),
        401: err(401),
      },
    },
    {
      method: 'patch',
      path: '/api/gm/users/{id}',
      tags: ['GM'],
      summary: '更新主站用户（role / isActive 白名单）',
      description: '禁止降级或禁用与当前 GM 同名的主站管理员（GM 自我保护，400 GM_SELF_PROTECTION）。',
      security: withAuth,
      parameters: [idParam()],
      request: body(GmUserUpdate, '仅允许 role/isActive，其余字段拒绝'),
      responses: {
        200: ok(User, '更新后的用户').config,
        400: err(400),
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'post',
      path: '/api/gm/users/{id}/reset-password',
      tags: ['GM'],
      summary: '重置主站用户密码（8-128 位）',
      security: withAuth,
      parameters: [idParam()],
      request: body(GmResetPassword, '新密码'),
      responses: {
        200: ok(NullData, '已重置（data=null）').config,
        400: err(400),
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'get',
      path: '/api/gm/downloads',
      tags: ['GM'],
      summary: '下载审计列表（分页，可按 userId 过滤，含归属用户名/邮箱）',
      security: withAuth,
      parameters: [
        queryParam('userId', { type: 'integer', minimum: 1 }, '仅返回该主站用户的下载'),
        queryParam('page', { type: 'integer', default: 1, minimum: 1 }, '页码，默认 1'),
        queryParam('pageSize', { type: 'integer', default: 20, minimum: 1, maximum: 100 }, '每页条数，默认 20，上限 100'),
      ],
      responses: {
        200: ok(GmDownloadListData, '分页下载列表').config,
        400: err(400),
        401: err(401),
      },
    },
    {
      method: 'post',
      path: '/api/gm/downloads/{id}/cancel',
      tags: ['GM'],
      summary: '强制取消下载（MVP：仅改 DB 状态，不联动运行时引擎）',
      description:
        '仅 pending/paused 可取消（置为 cancelled）；downloading/error/completed/cancelled ' +
        '等其它状态统一返回 409 CONFLICT；记录不存在返回 404。',
      security: withAuth,
      parameters: [idParam()],
      responses: {
        200: ok(GmCancelResult, '已置为 cancelled').config,
        400: err(400),
        401: err(401),
        404: err(404),
        409: err(409),
      },
    },
    {
      method: 'get',
      path: '/api/gm/uploads',
      tags: ['GM'],
      summary: '全部上传（只读审计，含归属用户名）',
      security: withAuth,
      responses: {
        200: ok(GmUploadItem.array(), '全部上传').config,
        401: err(401),
      },
    },

    // ================= AI =================
    {
      method: 'post',
      path: '/api/ai/classify',
      tags: ['AI'],
      summary: 'AI 文件分类',
      security: withAuth,
      request: body(AiClassifyRequest),
      responses: {
        200: ok(AiResultData, '分类结果；未配置 Key 时 configured=false').config,
        400: err(400),
        401: err(401),
        429: err(429),
      },
    },
    {
      method: 'post',
      path: '/api/ai/rewrite-query',
      tags: ['AI'],
      summary: 'AI 改写搜索词',
      security: withAuth,
      request: body(AiRewriteQueryRequest),
      responses: {
        200: ok(AiResultData, '改写结果').config,
        400: err(400),
        401: err(401),
        429: err(429),
      },
    },
    {
      method: 'post',
      path: '/api/ai/semantic-search',
      tags: ['AI'],
      summary: 'AI 语义检索（候选集重排）',
      security: withAuth,
      request: body(AiSemanticSearchRequest),
      responses: {
        200: ok(AiResultData, '重排后的候选').config,
        400: err(400),
        401: err(401),
        429: err(429),
      },
    },
    {
      method: 'post',
      path: '/api/ai/search-suggestions',
      tags: ['AI'],
      summary: 'AI 搜索联想',
      security: withAuth,
      request: body(AiSuggestionsRequest),
      responses: {
        200: ok(AiResultData, '联想词列表').config,
        400: err(400),
        401: err(401),
        429: err(429),
      },
    },
    {
      method: 'post',
      path: '/api/ai/recommendations',
      tags: ['AI'],
      summary: 'AI 个性化推荐',
      security: withAuth,
      request: body(AiRecommendationsRequest),
      responses: {
        200: ok(AiResultData, '推荐结果').config,
        400: err(400),
        401: err(401),
        429: err(429),
      },
    },
  ];

  for (const p of paths) registry.registerPath(p);

  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Download Manager API',
      version: '3.1.0',
      description:
        'v3.1.0 接口契约：所有响应使用统一信封 `{ success, data|error, timestamp }`。' +
        '文档由 apps/api/scripts/openapi/build-document.ts 生成，请勿手改 openapi.json。',
    },
    servers: [{ url: 'http://localhost:5001', description: '本地开发' }],
    tags: [
      { name: 'Auth', description: '认证与首次运行初始化（onboarding）' },
      { name: 'Downloads', description: '下载任务' },
      { name: 'Uploads', description: '上传记录' },
      { name: 'Files', description: '文件与目录' },
      { name: 'Health', description: '健康检查' },
      { name: 'Shares', description: '文件分享' },
      { name: 'Schedules', description: '定时调度' },
      { name: 'Stats', description: '统计面板数据' },
      { name: 'GM', description: '管理后台（独立 gm_users 账号与 GM JWT，与主站 JWT 不互通）' },
      { name: 'AI', description: 'LLM 辅助能力（独立限流 20 次/分钟）' },
    ],
  });
}

/** 稳定序列化：2 空格缩进，键顺序完全由构造代码决定（生成器本身亦按 key 排序组件） */
export function openApiDocumentJson(): string {
  return JSON.stringify(buildOpenApiDocument(), null, 2);
}
