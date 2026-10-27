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
  // storage / settings（服务端目录浏览与下载配置）
  StorageListingSchema,
  DownloadSettingsSchema,
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

// plugins（S4 Task 12：市场骨架；注册表静态返回，install 走本地目录）
const PluginPermissionSchema = z
  .object({
    type: z.enum(['network', 'fs', 'env', 'spawn', 'ui', 'api']),
  })
  .passthrough();

const PluginTypeSchema = z.enum(['download-adapter', 'script', 'ui']);

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
    schema.meta({ id });

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
  // Step3 契约单源复用：向导 Step 3 与「保存下载设置」是同一个对象，
  // 因此 PUT /api/settings/download 的请求体直接引用本组件，不另建同形 schema。
  const OnboardingStep3 = named('OnboardingStep3', OnboardingStep3Schema);
  // storage / settings
  const StorageListing = named('StorageListing', StorageListingSchema);
  const DownloadSettings = named('DownloadSettings', DownloadSettingsSchema);
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

  // plugins（S4 Task 12）
  const PluginRegistryEntry = named(
    'PluginRegistryEntry',
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      version: z.string().min(1),
      author: z.string().min(1),
      description: z.string(),
      type: PluginTypeSchema,
      permissions: z.array(PluginPermissionSchema).max(64),
    }),
  );
  const PluginRegistryListData = named(
    'PluginRegistryList',
    z.object({ plugins: PluginRegistryEntry.array() }),
  );
  const PluginManifestDetail = named(
    'PluginManifest',
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      version: z.string().min(1),
      author: z.string().min(1),
      description: z.string(),
      type: PluginTypeSchema,
      permissions: z.array(PluginPermissionSchema).max(64),
      entry: z.string().min(1),
    }),
  );
  const PluginInstallRequest = named(
    'PluginInstallRequest',
    z.object({
      // pattern 与运行时 PluginIdSchema（plugins.routes.ts）一致：字母/数字开头，仅字母数字与 . _ -
      id: z.string().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
      version: z.string().min(1).max(32).optional(),
    }),
  );
  const PluginInstallResultData = named(
    'PluginInstallResult',
    z.object({ manifest: PluginManifestDetail }),
  );
  const PluginInstalledListData = named(
    'PluginInstalledList',
    z.record(
      z.string(),
      z.object({
        version: z.string(),
        path: z.string(),
        enabled: z.boolean(),
        approvedAt: z.string().datetime(),
        state: z.enum(['installed', 'activated', 'deactivated', 'error', 'uninstalled']),
        lastError: z.union([z.string(), z.null()]),
      }),
    ),
  );
  /** 字符串型路径参数（插件 ID，与资源主键 idParam 不同） */
  const pluginIdParam = (description: string) => ({
    name: 'id',
    in: 'path' as const,
    required: true,
    description,
    schema: { type: 'string' as const, pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$' },
  });

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

    // ================= Plugins（S4 市场骨架）=================
    {
      method: 'get',
      path: '/api/plugins/registry',
      tags: ['Plugins'],
      summary: '官方插件注册表（v3.1.0 静态返回 hello-world）',
      description:
        '市场注册表骨架。v3.1.0 静态返回 [hello-world]；远端 registry 拉取随 v3.2.0 市场前端落地。',
      security: withAuth,
      responses: {
        200: ok(PluginRegistryListData, '官方插件列表').config,
        401: err(401),
      },
    },
    {
      method: 'get',
      path: '/api/plugins/registry/{id}',
      tags: ['Plugins'],
      summary: '插件详情（本地 manifest）',
      security: withAuth,
      parameters: [pluginIdParam('插件 ID（字母/数字开头，仅字母数字与 . _ -）')],
      responses: {
        200: ok(PluginManifestDetail, '插件 manifest').config,
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'get',
      path: '/api/plugins/installed',
      tags: ['Plugins'],
      summary: '已安装插件状态（installed.json 原样）',
      description: '键为插件 ID；文件缺失时返回空对象。运行时状态由 PluginHost 维护。',
      security: withAuth,
      responses: {
        200: ok(PluginInstalledListData, '已安装插件记录').config,
        401: err(401),
      },
    },
    {
      method: 'post',
      path: '/api/plugins/install',
      tags: ['Plugins'],
      summary: '校验本地插件并返回 manifest 供用户授权',
      description:
        'v3.1.0 从本地 plugins/<id>/ 解析 manifest（无远端下载、不落安装状态，' +
        '授权/落盘流程随 v3.2.0 市场前端落地）；version 可选，不匹配返回 400 VERSION_MISMATCH。',
      security: withAuth,
      request: body(PluginInstallRequest, '目标插件与可选版本'),
      responses: {
        200: ok(PluginInstallResultData, 'manifest 已解析，待用户授权').config,
        400: err(400),
        401: err(401),
        404: err(404),
      },
    },
    {
      method: 'post',
      path: '/api/plugins/{id}/enable',
      tags: ['Plugins'],
      summary: '启用插件（v3.1.0 未实现，固定 501）',
      description:
        '市场骨架语义保留：v3.1.0 请直接编辑 installed.json 的 enabled 字段，' +
        '启用/禁用交互随 v3.2.0 市场前端落地；当前统一返回 501 NOT_IMPLEMENTED。',
      security: withAuth,
      parameters: [pluginIdParam('插件 ID')],
      responses: {
        501: {
          description: '未实现（NOT_IMPLEMENTED）：v3.1.0 市场骨架',
          content: {
            [JSON_MEDIA]: { schema: { $ref: '#/components/schemas/ApiError' } },
          },
        },
        401: err(401),
      },
    },

    // ================= Storage（服务端目录浏览，仅管理员）=================
    {
      method: 'get',
      path: '/api/fs/dirs',
      tags: ['Storage'],
      summary: '列出服务端目录（下载目录选择器）',
      description:
        'Web 形态下浏览器无法调起系统目录选择框、也拿不到服务端路径，' +
        '因此由后端列出自己的目录供用户逐层点选。浏览范围被限制在 `DM_DOWNLOAD_ROOT`' +
        '（默认 `<cwd>/downloads`，不存在时自动创建）之内：越界或软链接逃逸一律 403，' +
        '不返回根目录之外的任何信息。只列目录、不列文件；返回的 `writable` 即服务端真实的写权限判定。' +
        '`path` 缺省表示根目录；相对路径按「相对下载根目录」解释。',
      security: withAuth,
      parameters: [
        queryParam('path', { type: 'string' }, '要列出的目录：服务端绝对路径或相对下载根目录的路径；缺省为根目录'),
      ],
      responses: {
        200: ok(StorageListing, '子目录列表与当前目录状态').config,
        400: err(400),
        401: err(401),
        403: err(403),
        404: err(404),
      },
    },

    // ================= Settings（应用设置，仅管理员）=================
    {
      method: 'get',
      path: '/api/settings/download',
      tags: ['Settings'],
      summary: '读取下载设置',
      description:
        '下载目录 / 最大并发 / 限速的服务端持久化版本（app_settings 表）。' +
        '未配置过时返回默认值并置 `configured: false`，前端据此区分「默认值」与「用户选择」。',
      security: withAuth,
      parameters: [],
      responses: {
        200: ok(DownloadSettings, '当前下载设置').config,
        401: err(401),
        403: err(403),
      },
    },
    {
      method: 'put',
      path: '/api/settings/download',
      tags: ['Settings'],
      summary: '保存下载设置（向导 Step 3 与服务端共用一份契约）',
      description:
        '请求体与 `OnboardingStep3` 同构。`downloadDir` 会先校验（须位于下载根目录内、存在且可写）' +
        '并归一化为服务端绝对路径后落库：校验失败不写库，直接 403/404/400，' +
        '避免存下一个「配置成功但根本不能用」的目录。',
      security: withAuth,
      request: body(OnboardingStep3, '下载目录 / 最大并发 / 限速（与向导 Step 3 同构）'),
      responses: {
        200: ok(DownloadSettings, '保存后的下载设置').config,
        400: err(400),
        401: err(401),
        403: err(403),
        404: err(404),
      },
    },
  ];

  // ================= 工业化 2.0 新增端点 =================
  // GM 运维面板 / 资源治理 / 跨地域调度 / AI 批量能力引入的端点。这些响应多为
  // 统计聚合，字段由控制器动态组装；此处只约定信封、鉴权与可达状态码，具体
  // 结构以控制器返回为准，避免在生成脚本里再维护一份容易腐坏的字段清单。
  const anyData = z.record(z.string(), z.unknown());
  const keyParam = {
    name: 'key',
    in: 'path' as const,
    required: true,
    description: '设置项键名',
    schema: { type: 'string' as const },
  };
  const genericOk = (description: string) => ok(anyData, description).config;
  /** 业务端点通用错误：GM 端点统一要求独立 GM JWT，故一律带 401/403/404 */
  const opResponses = (description: string, withBody = false, binary = false) => ({
    ...(withBody ? { 400: err(400) } : {}),
    200: binary
      ? {
          description,
          content: {
            'application/octet-stream': {
              schema: { type: 'string' as const, format: 'binary' as const },
            },
          },
        }
      : genericOk(description),
    401: err(401),
    403: err(403),
    404: err(404),
  });

  const additionalOps: PathDef[] = [
    // ---- 认证 / 下载 / AI ----
    {
      method: 'get',
      path: '/api/auth/csrf-token',
      tags: ['Auth'],
      summary: '获取 CSRF Token（双提交 Cookie）',
      description: '公开端点：下发 csrf Token，前端在非安全方法请求头 `x-csrf-token` 回传。',
      responses: { 200: genericOk('CSRF Token'), 429: err(429) },
    },
    {
      method: 'post',
      path: '/api/downloads/parse',
      tags: ['Downloads'],
      summary: '解析下载链接（BT 已下线：恒返回 400 BT_DISABLED）',
      description:
        '该端点原本用于解析磁力链接与 base64 .torrent 种子内的文件清单。' +
        'BT 引擎依赖 node-datachannel 原生绑定，当前镜像无法构建，因此端点明确返回 ' +
        '`BT_DISABLED`，前端不再展示磁力/种子入口；恢复到路线图中另行安排。',
      security: withAuth,
      responses: { 400: err(400), 401: err(401) },
    },
    {
      method: 'get',
      path: '/api/downloads/{id}/download',
      tags: ['Downloads'],
      summary: '下载已完成的任务文件',
      security: withAuth,
      parameters: [idParam()],
      responses: opResponses('文件二进制流（Content-Disposition: attachment）', false, true),
    },
    {
      method: 'post',
      path: '/api/ai/analyze-error',
      tags: ['AI'],
      summary: 'AI 分析下载失败原因',
      security: withAuth,
      request: body(z.record(z.string(), z.unknown()), '错误上下文'),
      responses: opResponses('分析结论与建议', true),
    },
    {
      method: 'post',
      path: '/api/ai/vector-search',
      tags: ['AI'],
      summary: '语义向量检索文件',
      security: withAuth,
      request: body(z.record(z.string(), z.unknown()), '自然语言查询'),
      responses: opResponses('按相关度排序的检索结果', true),
    },

    // ---- GM：运维总览与用户/内容管理 ----
    { method: 'get', path: '/api/gm/workers', tags: ['GM'], summary: 'Worker 集群状态与心跳', security: withAuth, parameters: [], responses: opResponses('在线 worker 列表与负载') },
    { method: 'get', path: '/api/gm/logs', tags: ['GM'], summary: 'GM 系统日志查询', security: withAuth, parameters: [], responses: opResponses('日志分页结果') },
    { method: 'get', path: '/api/gm/activities', tags: ['GM'], summary: '全局活动审计', security: withAuth, parameters: [], responses: opResponses('活动记录分页结果') },
    { method: 'delete', path: '/api/gm/uploads/{id}', tags: ['GM'], summary: '删除上传记录', security: withAuth, parameters: [idParam()], responses: opResponses('删除结果') },
    { method: 'get', path: '/api/gm/settings', tags: ['GM'], summary: '列出系统设置项', security: withAuth, parameters: [], responses: opResponses('设置键值列表') },
    { method: 'patch', path: '/api/gm/settings/{key}', tags: ['GM'], summary: '更新单个系统设置', security: withAuth, parameters: [keyParam], request: body(z.record(z.string(), z.unknown()), '新值'), responses: opResponses('更新后的设置项', true) },

    // ---- GM：插件管理 ----
    { method: 'get', path: '/api/gm/plugins', tags: ['GM'], summary: '插件列表（含启用状态与错误）', security: withAuth, parameters: [], responses: opResponses('插件清单') },
    {
      method: 'post',
      path: '/api/gm/plugins/upload',
      tags: ['GM'],
      summary: '上传并安装插件包（multipart/form-data，字段名 plugin）',
      security: withAuth,
      responses: opResponses('安装结果与插件清单'),
    },
    { method: 'post', path: '/api/gm/plugins/{id}/toggle', tags: ['GM'], summary: '启用/停用插件', security: withAuth, parameters: [idParam()], request: body(z.record(z.string(), z.unknown()), '目标状态'), responses: opResponses('更新后的插件状态', true) },
    { method: 'delete', path: '/api/gm/plugins/{id}', tags: ['GM'], summary: '卸载插件', security: withAuth, parameters: [idParam()], responses: opResponses('卸载结果') },

    // ---- GM：资源治理 ----
    { method: 'get', path: '/api/gm/storage/stats', tags: ['GM'], summary: '存储用量总览', security: withAuth, parameters: [], responses: opResponses('容量与占用统计') },
    { method: 'get', path: '/api/gm/storage/category-stats', tags: ['GM'], summary: '按文件类型统计占用', security: withAuth, parameters: [], responses: opResponses('分类占用统计') },
    { method: 'get', path: '/api/gm/storage/trends', tags: ['GM'], summary: '存储增长趋势', security: withAuth, parameters: [], responses: opResponses('时间序列趋势') },
    { method: 'get', path: '/api/gm/storage/ai-insights', tags: ['GM'], summary: 'AI 存储治理建议', security: withAuth, parameters: [], responses: opResponses('治理建议列表') },
    { method: 'get', path: '/api/gm/storage/duplicates', tags: ['GM'], summary: '重复文件检测', security: withAuth, parameters: [], responses: opResponses('重复文件分组') },
    { method: 'get', path: '/api/gm/storage/archiving/suggestions', tags: ['GM'], summary: '归档建议（冷数据识别）', security: withAuth, parameters: [], responses: opResponses('归档候选文件') },
    { method: 'post', path: '/api/gm/storage/archiving/apply', tags: ['GM'], summary: '执行归档', security: withAuth, request: body(z.record(z.string(), z.unknown()), '待归档文件 ID 列表'), responses: opResponses('归档执行结果', true) },
    { method: 'post', path: '/api/gm/storage/archiving/restore', tags: ['GM'], summary: '从归档恢复', security: withAuth, request: body(z.record(z.string(), z.unknown()), '待恢复文件 ID 列表'), responses: opResponses('恢复执行结果', true) },
    { method: 'get', path: '/api/gm/storage/user-profiles', tags: ['GM'], summary: '用户存储画像', security: withAuth, parameters: [], responses: opResponses('各用户配额与用量') },
    { method: 'post', path: '/api/gm/storage/ai-action', tags: ['GM'], summary: '执行 AI 建议的治理动作', security: withAuth, request: body(z.record(z.string(), z.unknown()), '动作与目标'), responses: opResponses('执行结果', true) },
    { method: 'get', path: '/api/gm/storage/cleanup/preview', tags: ['GM'], summary: '清理预演（不删除）', security: withAuth, parameters: [], responses: opResponses('可清理文件与预计释放空间') },
    { method: 'post', path: '/api/gm/storage/cleanup', tags: ['GM'], summary: '执行存储清理', security: withAuth, request: body(z.record(z.string(), z.unknown()), '清理条件'), responses: opResponses('清理结果', true) },

    // ---- GM：流量与自动扩缩容 ----
    { method: 'get', path: '/api/gm/traffic/stats', tags: ['GM'], summary: '流量总览', security: withAuth, parameters: [], responses: opResponses('上行/下行与峰值统计') },
    { method: 'get', path: '/api/gm/traffic/geo-stats', tags: ['GM'], summary: '按地域聚合的流量统计', security: withAuth, parameters: [], responses: opResponses('地域流量分布') },
    { method: 'get', path: '/api/gm/traffic/forecast', tags: ['GM'], summary: '流量预测', security: withAuth, parameters: [], responses: opResponses('预测曲线与置信区间') },
    { method: 'get', path: '/api/gm/storage/geo-insights', tags: ['GM'], summary: '跨地域调度洞察', security: withAuth, parameters: [], responses: opResponses('地域调度建议') },
    { method: 'get', path: '/api/gm/autonomous/logs', tags: ['GM'], summary: '自动扩缩容决策日志', security: withAuth, parameters: [], responses: opResponses('扩缩容事件记录') },
    { method: 'get', path: '/api/gm/autonomous/status', tags: ['GM'], summary: '自动扩缩容当前状态', security: withAuth, parameters: [], responses: opResponses('扩缩容开关与阈值') },
    { method: 'post', path: '/api/gm/autonomous/toggle', tags: ['GM'], summary: '开关自动扩缩容', security: withAuth, request: body(z.record(z.string(), z.unknown()), '目标状态'), responses: opResponses('更新后的状态', true) },

    // ---- GM：跨地域调度策略（GeoPolicy）----
    { method: 'get', path: '/api/gm/storage/geo-policies', tags: ['GM'], summary: '列出跨地域调度策略', security: withAuth, parameters: [], responses: opResponses('策略列表') },
    { method: 'post', path: '/api/gm/storage/geo-policies', tags: ['GM'], summary: '创建跨地域调度策略', security: withAuth, request: body(z.record(z.string(), z.unknown()), '策略定义'), responses: opResponses('创建后的策略', true) },
    { method: 'patch', path: '/api/gm/storage/geo-policies/{id}', tags: ['GM'], summary: '更新跨地域调度策略', security: withAuth, parameters: [idParam()], request: body(z.record(z.string(), z.unknown()), '策略定义'), responses: opResponses('更新后的策略', true) },
    { method: 'delete', path: '/api/gm/storage/geo-policies/{id}', tags: ['GM'], summary: '删除跨地域调度策略', security: withAuth, parameters: [idParam()], responses: opResponses('删除结果') },
  ];
  paths.push(...additionalOps);

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
      { name: 'Plugins', description: '插件市场（S4 骨架：注册表静态返回，安装走本地目录）' },
      { name: 'Storage', description: '服务端目录浏览（下载目录选择器，仅管理员）' },
      { name: 'Settings', description: '应用设置（下载配置的服务端持久化，仅管理员）' },
    ],
  });
}

/** 稳定序列化：2 空格缩进，键顺序完全由构造代码决定（生成器本身亦按 key 排序组件） */
export function openApiDocumentJson(): string {
  return JSON.stringify(buildOpenApiDocument(), null, 2);
}
