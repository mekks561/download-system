/**
 * OpenAPI 文档回归（S3 Task 3）：
 * - 生成幂等：同一进程连构建两次，JSON 必须逐字节一致（防时间戳/无序 Map 抖动）
 * - 结构完整：JSON 可解析；每个 operation 至少声明一个带 description 的 response
 * - $ref 全部可解析（无悬空引用）
 * - 2xx 成功响应统一信封 { success:true, data, timestamp }
 * - S1 onboarding 契约：setup/skip-setup 为 201，setup-status 为 GET
 *
 * 纯内存校验，不写仓库文件、不依赖数据库。
 */
import { describe, it, expect } from 'vitest';
import { buildOpenApiDocument } from './build-document';

type Doc = Record<string, any>;

/** 遍历文档收集所有 $ref */
function collectRefs(node: unknown, refs: Set<string> = new Set()): Set<string> {
  if (!node || typeof node !== 'object') return refs;
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, refs);
    return refs;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj.$ref === 'string') refs.add(obj.$ref);
  for (const value of Object.values(obj)) collectRefs(value, refs);
  return refs;
}

function resolveRef(doc: Doc, ref: string): unknown {
  const parts = ref
    .replace(/^#\//, '')
    .split('/')
    .map((p) => p.replace(/~1/g, '/'));
  let cur: unknown = doc;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

function eachOperation(
  doc: Doc,
  cb: (args: { path: string; method: string; operation: Doc }) => void,
) {
  for (const [path, pathItem] of Object.entries(doc.paths as Record<string, Doc>)) {
    for (const method of HTTP_METHODS) {
      if (pathItem[method]) cb({ path, method, operation: pathItem[method] as Doc });
    }
  }
}

describe('OpenAPI 文档构造', () => {
  it('产物是可 JSON 解析的 OpenAPI 3.0 文档', () => {
    const doc = buildOpenApiDocument() as unknown as Doc;
    expect(doc.openapi).toBe('3.0.0');
    expect(doc.info.title).toBeTruthy();
    // JSON 往返无损：序列化→解析→再序列化逐字节一致（同时验证可解析性）
    const roundtrip = JSON.parse(JSON.stringify(doc)) as Doc;
    expect(JSON.stringify(roundtrip)).toBe(JSON.stringify(doc));
    expect(Object.keys(doc.paths as Record<string, unknown>).length).toBeGreaterThan(40);
  });

  it('幂等：连构建两次输出逐字节一致（无时间戳/无序抖动）', () => {
    const first = JSON.stringify(buildOpenApiDocument(), null, 2);
    const second = JSON.stringify(buildOpenApiDocument(), null, 2);
    expect(second).toBe(first);
  });

  it('每个 operation 都声明至少一个 response，且每个 response 有 description', () => {
    const doc = buildOpenApiDocument() as unknown as Doc;
    let count = 0;
    eachOperation(doc, ({ path, method, operation }) => {
      const responses = operation.responses as Doc;
      const keys = Object.keys(responses);
      expect(keys.length, `${method.toUpperCase()} ${path} 无 responses`).toBeGreaterThan(0);
      for (const [status, raw] of Object.entries(responses)) {
        // 429/401 等公共错误复用 components/responses 中的 $ref
        const ref = (raw as Doc)?.$ref as string | undefined;
        const resp = ref ? (resolveRef(doc, ref) as Doc) : (raw as Doc);
        const description = resp?.description;
        expect(typeof description, `${method.toUpperCase()} ${path} ${status} 缺 description`).toBe(
          'string',
        );
      }
      count += 1;
    });
    // 与 src/routes 实际注册数对齐（S4 Task 12 后 Plugins 为 5 端点；
    // 目录浏览 + 下载设置的 3 个端点后为 64）
    expect(count).toBe(64);
  });

  it('所有 $ref 均可在文档内解析（无悬空引用）', () => {
    const doc = buildOpenApiDocument() as unknown as Doc;
    const dangling = [...collectRefs(doc)].filter((ref) => resolveRef(doc, ref) === undefined);
    expect(dangling).toEqual([]);
  });

  it('2xx JSON 响应统一使用 success 信封', () => {
    const doc = buildOpenApiDocument() as unknown as Doc;
    eachOperation(doc, ({ path, method, operation }) => {
      for (const status of Object.keys(operation.responses as Doc)) {
        if (!status.startsWith('2')) continue;
        const schema = (operation.responses as Doc)[status]?.content?.['application/json']
          ?.schema as Doc | undefined;
        // 2xx 均为内联信封对象（不使用 $ref）
        expect(schema?.type, `${method.toUpperCase()} ${path} ${status}`).toBe('object');
        expect(schema?.properties?.success?.const ?? schema?.properties?.success?.enum?.[0]).toBe(
          true,
        );
        expect(schema?.properties?.data).toBeTruthy();
        expect(schema?.properties?.timestamp?.format).toBe('date-time');
      }
    });
  });

  it('S1 onboarding 端点契约：setup-status 为 GET 布尔；setup/skip-setup 为 POST 201', () => {
    const doc = buildOpenApiDocument() as unknown as Doc;
    const statusOp = doc.paths['/api/auth/setup-status'];
    expect(statusOp.get).toBeTruthy();
    expect(statusOp.post).toBeUndefined();

    const setup = doc.paths['/api/auth/setup'].post;
    expect(setup.responses['201']).toBeTruthy();
    expect(setup.responses['200']).toBeUndefined();
    expect(setup.responses['409']).toBeTruthy();

    const skip = doc.paths['/api/auth/skip-setup'].post;
    expect(skip.responses['201']).toBeTruthy();
    expect(skip.responses['200']).toBeUndefined();
    expect(skip.responses['409']).toBeTruthy();
  });

  it('packages/shared 对外 schema 均已注册为组件（含 onboarding + 信封）', () => {
    const doc = buildOpenApiDocument() as unknown as Doc;
    const required = [
      // 实体
      'User', 'Download', 'Upload', 'File', 'Share', 'Schedule', 'ScheduleLog', 'Activity',
      // auth DTO
      'UserCreate', 'Login', 'UserUpdate', 'ChangePassword', 'DeleteAccount',
      // download/file/share/schedule DTO
      'DownloadCreate', 'DownloadUpdate',
      'FileCreateFolder', 'FileRename', 'FileMove',
      'ShareCreate', 'ShareUpdate',
      'ScheduleCreate', 'ScheduleUpdate',
      // onboarding
      'OnboardingStep2', 'OnboardingStep3', 'OnboardingStatus',
      'OnboardingSetupResult', 'OnboardingSkipResult',
      // storage / settings
      'StorageListing', 'DownloadSettings',
      // gm（S3 Task 4 B-lite）
      'GmLogin', 'GmResetPassword', 'GmUserUpdate', 'GmPrincipal', 'GmAuthResult',
      'GmDashboard', 'GmUserList', 'GmDownloadItem', 'GmDownloadList',
      'GmCancelResult', 'GmUploadItem', 'NullData',
      // 信封
      'ApiSuccess', 'ApiError',
    ];
    for (const name of required) {
      expect(doc.components.schemas[name], `缺少组件 ${name}`).toBeTruthy();
    }
  });

  it('鉴权端点声明 bearerAuth；公开端点不声明', () => {
    const doc = buildOpenApiDocument() as unknown as Doc;
    for (const publicPath of [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/setup',
      '/api/auth/setup-status',
      '/api/auth/skip-setup',
      '/api/gm/auth/login',
      '/api/health',
    ]) {
      const op = Object.values(doc.paths[publicPath] as Record<string, Doc>)[0] as Doc;
      expect(op.security ?? [], `${publicPath} 不应要求鉴权`).toEqual([]);
    }
    const profile = doc.paths['/api/auth/profile'].get;
    expect(profile.security).toEqual([{ bearerAuth: [] }]);
    // S3 Task 4：GM 受保护路由（除登录外）必须挂 bearerAuth
    for (const [path, ops] of Object.entries(doc.paths as Record<string, Doc>)) {
      if (!path.startsWith('/api/gm/') || path === '/api/gm/auth/login') continue;
      for (const method of ['get', 'post', 'patch'] as const) {
        const op = (ops as Doc)[method] as Doc | undefined;
        if (op) expect(op.security, `${method.toUpperCase()} ${path} 缺 bearerAuth`).toEqual([{ bearerAuth: [] }]);
      }
    }
  });
});
