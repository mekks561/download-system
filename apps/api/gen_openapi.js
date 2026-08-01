const fs = require('fs');

const openapi = {
  openapi: "3.0.3",
  info: { title: "下载管理系统 API", description: "下载管理系统后端接口文档", version: "2.5.0" },
  servers: [{ url: "http://localhost:5001/api", description: "本地开发环境" }],
  security: [{ bearerAuth: [] }],
  paths: {},
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {}
  }
};

const routeDefinitions = [
  { path: "/auth/register", method: "post", summary: "用户注册", auth: false, requestBody: "RegisterRequest", response200: "AuthResponse" },
  { path: "/auth/login", method: "post", summary: "用户登录", auth: false, requestBody: "LoginRequest", response200: "AuthResponse" },
  { path: "/auth/profile", method: "get", summary: "获取用户信息", auth: true, responseSchema: "{success: boolean, user: User}" },
  { path: "/auth/profile", method: "put", summary: "更新用户信息", auth: true, requestBody: "UpdateProfileRequest", responseSchema: "{success: boolean, message: string, data: User}" },
  { path: "/auth/change-password", method: "post", summary: "修改密码", auth: true, requestBody: "ChangePasswordRequest" },
  { path: "/auth/logout", method: "post", summary: "用户登出", auth: true },
  { path: "/auth/account", method: "delete", summary: "注销账户", auth: true },
  { path: "/auth/2fa/send-code", method: "post", summary: "发送两步验证验证码", auth: true },
  { path: "/auth/2fa/verify", method: "post", summary: "验证两步验证验证码", auth: true },
  { path: "/auth/2fa/disable", method: "post", summary: "关闭两步验证", auth: true },
  { path: "/downloads", method: "get", summary: "获取下载列表", auth: true, params: ["page", "limit", "status"], responseSchema: "{success: boolean, data: Download[], total: integer, page: integer, limit: integer}" },
  { path: "/downloads", method: "post", summary: "创建下载任务", auth: true, requestBody: "DownloadRequest", responseSchema: "{success: boolean, message: string, data: Download}" },
  { path: "/downloads/{id}", method: "get", summary: "获取下载任务详情", auth: true, pathParams: ["id"], responseSchema: "{success: boolean, data: Download}" },
  { path: "/downloads/{id}", method: "put", summary: "更新下载任务", auth: true, pathParams: ["id"], requestBody: "DownloadUpdateRequest", responseSchema: "{success: boolean, message: string, data: Download}" },
  { path: "/downloads/{id}", method: "delete", summary: "删除下载任务", auth: true, pathParams: ["id"] },
  { path: "/downloads/clear", method: "delete", summary: "清空已完成下载", auth: true },
  { path: "/uploads", method: "get", summary: "获取上传列表", auth: true, params: ["page", "limit", "status"], responseSchema: "{success: boolean, data: Upload[], total: integer, page: integer, limit: integer}" },
  { path: "/upload", method: "post", summary: "上传文件", auth: true, requestBody: "multipart" },
  { path: "/uploads/{id}", method: "get", summary: "获取上传文件详情", auth: true, pathParams: ["id"], responseSchema: "{success: boolean, data: Upload}" },
  { path: "/uploads/{id}", method: "put", summary: "更新上传文件", auth: true, pathParams: ["id"] },
  { path: "/uploads/{id}", method: "delete", summary: "删除上传文件", auth: true, pathParams: ["id"] },
  { path: "/uploads/clear", method: "delete", summary: "清空已完成上传", auth: true },
  { path: "/files", method: "get", summary: "获取用户文件列表", auth: true, params: ["folderId"], responseSchema: "{success: boolean, data: File[]}" },
  { path: "/files/{id}", method: "get", summary: "获取文件信息", auth: true, pathParams: ["id"], responseSchema: "{success: boolean, data: File}" },
  { path: "/files/{id}", method: "put", summary: "重命名文件", auth: true, pathParams: ["id"] },
  { path: "/files/{id}", method: "delete", summary: "删除文件", auth: true, pathParams: ["id"] },
  { path: "/files/batch-delete", method: "post", summary: "批量删除文件", auth: true },
  { path: "/files/folder", method: "post", summary: "创建文件夹", auth: true, responseSchema: "{success: boolean, message: string, data: File}" },
  { path: "/files/move", method: "post", summary: "移动文件", auth: true },
  { path: "/tags", method: "get", summary: "获取标签列表", auth: true, responseSchema: "{success: boolean, data: Tag[]}" },
  { path: "/tags", method: "post", summary: "创建标签", auth: true, requestBody: "TagRequest", responseSchema: "{success: boolean, message: string, data: Tag}" },
  { path: "/tags/{id}", method: "get", summary: "获取标签详情", auth: true, pathParams: ["id"], responseSchema: "{success: boolean, data: Tag}" },
  { path: "/tags/{id}", method: "put", summary: "更新标签", auth: true, pathParams: ["id"], requestBody: "TagRequest" },
  { path: "/tags/{id}", method: "delete", summary: "删除标签", auth: true, pathParams: ["id"] },
  { path: "/schedules", method: "get", summary: "获取调度列表", auth: true, responseSchema: "{success: boolean, data: Schedule[]}" },
  { path: "/schedules", method: "post", summary: "创建调度任务", auth: true, requestBody: "ScheduleRequest", responseSchema: "{success: boolean, message: string, data: Schedule}" },
  { path: "/schedules/{id}", method: "get", summary: "获取调度任务详情", auth: true, pathParams: ["id"], responseSchema: "{success: boolean, data: Schedule}" },
  { path: "/schedules/{id}", method: "put", summary: "更新调度任务", auth: true, pathParams: ["id"], requestBody: "ScheduleRequest" },
  { path: "/schedules/{id}", method: "delete", summary: "删除调度任务", auth: true, pathParams: ["id"] },
  { path: "/schedules/{id}/toggle", method: "post", summary: "切换调度任务状态", auth: true, pathParams: ["id"] },
  { path: "/schedules/{schedule_id}/logs", method: "get", summary: "获取调度日志", auth: true, pathParams: ["schedule_id"], responseSchema: "{success: boolean, data: ScheduleLog[]}" },
  { path: "/shares", method: "get", summary: "获取分享列表", auth: true, responseSchema: "{success: boolean, data: Share[]}" },
  { path: "/shares", method: "post", summary: "创建分享链接", auth: true, requestBody: "ShareRequest", responseSchema: "{success: boolean, message: string, data: Share}" },
  { path: "/shares/stats", method: "get", summary: "获取分享统计", auth: true },
  { path: "/shares/{id}", method: "get", summary: "获取分享详情", auth: true, pathParams: ["id"], responseSchema: "{success: boolean, data: Share}" },
  { path: "/shares/{id}", method: "put", summary: "更新分享链接", auth: true, pathParams: ["id"], requestBody: "ShareRequest" },
  { path: "/shares/{id}", method: "delete", summary: "删除分享链接", auth: true, pathParams: ["id"] },
  { path: "/shares/{id}/toggle", method: "patch", summary: "切换分享状态", auth: true, pathParams: ["id"] },
  { path: "/shares/{token}", method: "get", summary: "访问分享链接", auth: false, pathParams: ["token"] },
  { path: "/shares/{token}/download", method: "post", summary: "下载分享文件", auth: false, pathParams: ["token"] },
  { path: "/stats", method: "get", summary: "获取统计数据", auth: true },
  { path: "/stats/trend", method: "get", summary: "获取趋势数据", auth: true },
  { path: "/stats/file-types", method: "get", summary: "获取文件类型统计", auth: true },
  { path: "/stats/activities", method: "get", summary: "获取最近活动", auth: true },
  { path: "/search/downloads", method: "get", summary: "搜索下载任务", auth: true, params: ["keyword"], responseSchema: "{success: boolean, data: Download[]}" },
  { path: "/search/uploads", method: "get", summary: "搜索上传文件", auth: true, params: ["keyword"], responseSchema: "{success: boolean, data: Upload[]}" },
  { path: "/search/files", method: "get", summary: "搜索文件", auth: true, params: ["keyword"], responseSchema: "{success: boolean, data: File[]}" },
  { path: "/search", method: "get", summary: "全局搜索", auth: true, params: ["keyword"] },
  { path: "/health", method: "get", summary: "健康检查", auth: false },
  { path: "/metrics", method: "get", summary: "获取指标", auth: false },
  { path: "/scheduler/status", method: "get", summary: "获取调度器状态", auth: false },
  { path: "/gm/login", method: "post", summary: "管理员登录", auth: false },
  { path: "/gm/profile", method: "get", summary: "获取管理员信息", auth: true },
  { path: "/gm/stats", method: "get", summary: "获取管理统计", auth: true },
  { path: "/gm/users", method: "get", summary: "获取用户列表", auth: true, responseSchema: "{success: boolean, data: User[]}" },
  { path: "/gm/users/{id}", method: "delete", summary: "删除用户", auth: true, pathParams: ["id"] },
  { path: "/gm/downloads", method: "get", summary: "获取所有下载", auth: true, responseSchema: "{success: boolean, data: Download[]}" },
  { path: "/gm/uploads", method: "get", summary: "获取所有上传", auth: true, responseSchema: "{success: boolean, data: Upload[]}" },
  { path: "/export/downloads", method: "get", summary: "导出下载数据", auth: true },
  { path: "/export/downloads/csv", method: "get", summary: "导出下载数据CSV", auth: true },
  { path: "/import", method: "post", summary: "导入数据", auth: true }
];

routeDefinitions.forEach(item => {
  if (!openapi.paths[item.path]) openapi.paths[item.path] = {};
  const method = item.method;
  const definition = {
    summary: item.summary,
    security: item.auth ? [{ bearerAuth: [] }] : undefined,
    parameters: [],
    responses: {
      "200": { description: "成功", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" } } } } } },
      "401": { description: "未授权", content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } } }
    }
  };

  if (item.params) {
    item.params.forEach(p => {
      definition.parameters.push({ name: p, in: "query", description: p, schema: { type: "string" } });
    });
  }

  if (item.pathParams) {
    item.pathParams.forEach(p => {
      definition.parameters.push({ name: p, in: "path", required: true, description: p, schema: { type: "integer" } });
    });
  }

  if (item.requestBody) {
    if (item.requestBody === "multipart") {
      definition.requestBody = {
        required: true,
        content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" }, folderId: { type: "integer" } } } } }
      };
    } else {
      definition.requestBody = {
        required: true,
        content: { "application/json": { schema: { "$ref": `#/components/schemas/${item.requestBody}` } } }
      };
    }
  }

  openapi.paths[item.path][method] = definition;
});

const schemas = {
  User: { type: "object", properties: { id: { type: "integer" }, username: { type: "string" }, email: { type: "string", format: "email" }, phone: { type: "string", nullable: true }, is_2fa_enabled: { type: "boolean" }, created_at: { type: "string", format: "date-time" }, updated_at: { type: "string", format: "date-time" } } },
  RegisterRequest: { type: "object", properties: { username: { type: "string" }, email: { type: "string", format: "email" }, password: { type: "string" } }, required: ["username", "email", "password"] },
  LoginRequest: { type: "object", properties: { email: { type: "string", format: "email" }, password: { type: "string" } }, required: ["email", "password"] },
  UpdateProfileRequest: { type: "object", properties: { username: { type: "string" }, email: { type: "string", format: "email" }, phone: { type: "string" } } },
  ChangePasswordRequest: { type: "object", properties: { oldPassword: { type: "string" }, newPassword: { type: "string" } }, required: ["oldPassword", "newPassword"] },
  AuthResponse: { type: "object", properties: { success: { type: "boolean" }, token: { type: "string" }, user: { "$ref": "#/components/schemas/User" } } },
  ErrorResponse: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, code: { type: "string" } } },
  Download: { type: "object", properties: { id: { type: "integer" }, url: { type: "string" }, filename: { type: "string" }, status: { type: "string", enum: ["pending", "downloading", "completed", "error", "cancelled"] }, progress: { type: "number", minimum: 0, maximum: 100 }, downloaded_bytes: { type: "integer" }, total_bytes: { type: "integer" }, speed: { type: "integer" }, folder_id: { type: "integer", nullable: true }, user_id: { type: "integer" }, created_at: { type: "string", format: "date-time" }, updated_at: { type: "string", format: "date-time" }, completed_at: { type: "string", format: "date-time", nullable: true }, error_message: { type: "string", nullable: true } } },
  DownloadRequest: { type: "object", properties: { url: { type: "string" }, filename: { type: "string" }, folder_id: { type: "integer", nullable: true } }, required: ["url"] },
  DownloadUpdateRequest: { type: "object", properties: { status: { type: "string", enum: ["pending", "downloading", "completed", "error", "cancelled"] }, progress: { type: "number", minimum: 0, maximum: 100 }, downloaded_bytes: { type: "integer" }, total_bytes: { type: "integer" }, speed: { type: "integer" }, error_message: { type: "string" }, completed_at: { type: "string", format: "date-time" } } },
  Upload: { type: "object", properties: { id: { type: "integer" }, filename: { type: "string" }, original_filename: { type: "string" }, status: { type: "string", enum: ["pending", "uploading", "completed", "error", "cancelled"] }, progress: { type: "number", minimum: 0, maximum: 100 }, uploaded_bytes: { type: "integer" }, total_bytes: { type: "integer" }, speed: { type: "integer" }, folder_id: { type: "integer", nullable: true }, user_id: { type: "integer" }, created_at: { type: "string", format: "date-time" }, updated_at: { type: "string", format: "date-time" }, completed_at: { type: "string", format: "date-time", nullable: true } } },
  File: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" }, type: { type: "string", enum: ["file", "folder"] }, path: { type: "string" }, size: { type: "integer", nullable: true }, folder_id: { type: "integer", nullable: true }, user_id: { type: "integer" }, download_id: { type: "integer", nullable: true }, upload_id: { type: "integer", nullable: true }, created_at: { type: "string", format: "date-time" }, updated_at: { type: "string", format: "date-time" } } },
  Tag: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" }, color: { type: "string" }, user_id: { type: "integer" }, created_at: { type: "string", format: "date-time" }, updated_at: { type: "string", format: "date-time" } } },
  TagRequest: { type: "object", properties: { name: { type: "string" }, color: { type: "string" } }, required: ["name"] },
  Schedule: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" }, url: { type: "string" }, cron_expression: { type: "string" }, enabled: { type: "boolean" }, user_id: { type: "integer" }, created_at: { type: "string", format: "date-time" }, updated_at: { type: "string", format: "date-time" } } },
  ScheduleRequest: { type: "object", properties: { name: { type: "string" }, url: { type: "string" }, cron_expression: { type: "string" } }, required: ["name", "url", "cron_expression"] },
  ScheduleLog: { type: "object", properties: { id: { type: "integer" }, schedule_id: { type: "integer" }, status: { type: "string", enum: ["success", "failed"] }, message: { type: "string", nullable: true }, created_at: { type: "string", format: "date-time" } } },
  Share: { type: "object", properties: { id: { type: "integer" }, file_id: { type: "integer" }, token: { type: "string" }, enabled: { type: "boolean" }, expires_at: { type: "string", format: "date-time", nullable: true }, downloads: { type: "integer" }, views: { type: "integer" }, user_id: { type: "integer" }, created_at: { type: "string", format: "date-time" }, updated_at: { type: "string", format: "date-time" } } },
  ShareRequest: { type: "object", properties: { file_id: { type: "integer" }, expires_at: { type: "string", format: "date-time", nullable: true } }, required: ["file_id"] }
};

Object.assign(openapi.components.schemas, schemas);

fs.writeFileSync('openapi.json', JSON.stringify(openapi, null, 2), 'utf8');
console.log('openapi.json generated successfully');