-- =============================================
-- 下载管理系统 - MySQL数据库结构
-- 版本: 2.5.0
-- =============================================

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS download_manager
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE download_manager;

-- =============================================
-- 用户表
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  email VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱地址',
  password VARCHAR(255) NOT NULL COMMENT '加密后的密码',
  phone VARCHAR(20) NULL COMMENT '手机号码',
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否启用两步验证',
  two_factor_secret VARCHAR(255) NULL COMMENT '两步验证密钥',
  two_factor_phone VARCHAR(20) NULL COMMENT '绑定的验证手机号',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- =============================================
-- 用户登录历史表
-- =============================================
CREATE TABLE IF NOT EXISTS user_login_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  ip_address VARCHAR(50) NULL COMMENT '登录IP',
  user_agent TEXT NULL COMMENT '用户代理',
  login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
  logout_time DATETIME NULL COMMENT '登出时间',
  status ENUM('success', 'failed') NOT NULL DEFAULT 'success' COMMENT '登录状态',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_login_time (login_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户登录历史表';

-- =============================================
-- 下载记录表
-- =============================================
CREATE TABLE IF NOT EXISTS downloads (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  url VARCHAR(2048) NOT NULL COMMENT '下载URL',
  filename VARCHAR(255) NOT NULL COMMENT '文件名',
  status ENUM('pending', 'downloading', 'completed', 'error', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '下载状态',
  progress DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '下载进度 0-100',
  downloaded_bytes BIGINT NOT NULL DEFAULT 0 COMMENT '已下载字节数',
  total_bytes BIGINT NOT NULL DEFAULT 0 COMMENT '总字节数',
  speed BIGINT NOT NULL DEFAULT 0 COMMENT '下载速度 bytes/s',
  resume_position BIGINT NOT NULL DEFAULT 0 COMMENT '断点续传位置',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  completed_at DATETIME NULL COMMENT '完成时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='下载记录表';

-- =============================================
-- 上传记录表
-- =============================================
CREATE TABLE IF NOT EXISTS uploads (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  filename VARCHAR(255) NOT NULL COMMENT '服务器文件名（UUID）',
  original_filename VARCHAR(255) NOT NULL COMMENT '原始文件名',
  file_path VARCHAR(512) NOT NULL COMMENT '文件完整路径',
  status ENUM('pending', 'uploading', 'completed', 'error', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '上传状态',
  progress DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '上传进度 0-100',
  uploaded_bytes BIGINT NOT NULL DEFAULT 0 COMMENT '已上传字节数',
  total_bytes BIGINT NOT NULL DEFAULT 0 COMMENT '总字节数',
  speed BIGINT NOT NULL DEFAULT 0 COMMENT '上传速度 bytes/s',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  completed_at DATETIME NULL COMMENT '完成时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='上传记录表';

-- =============================================
-- 下载计划表
-- =============================================
CREATE TABLE IF NOT EXISTS download_schedules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  url TEXT NOT NULL COMMENT '下载URL',
  filename VARCHAR(255) NULL COMMENT '文件名',
  schedule_type ENUM('once', 'daily', 'weekly', 'monthly') NOT NULL DEFAULT 'once' COMMENT '计划类型',
  schedule_time TIME NOT NULL COMMENT '执行时间',
  schedule_day VARCHAR(20) NULL COMMENT '星期（weekly类型）',
  schedule_date DATE NULL COMMENT '日期（monthly类型）',
  priority INT NOT NULL DEFAULT 5 COMMENT '优先级 1-10',
  status ENUM('active', 'paused', 'completed', 'failed') NOT NULL DEFAULT 'active' COMMENT '计划状态',
  last_run_at DATETIME NULL COMMENT '上次执行时间',
  next_run_at DATETIME NOT NULL COMMENT '下次执行时间',
  total_runs INT NOT NULL DEFAULT 0 COMMENT '已执行次数',
  error_message TEXT NULL COMMENT '错误信息',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_download_schedules_user_id (user_id),
  INDEX idx_download_schedules_status (status),
  INDEX idx_download_schedules_next_run (next_run_at),
  INDEX idx_download_schedules_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='下载计划表';

-- =============================================
-- 下载计划执行日志表
-- =============================================
CREATE TABLE IF NOT EXISTS download_schedule_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  schedule_id BIGINT NOT NULL COMMENT '计划ID',
  status ENUM('success', 'failed') NOT NULL COMMENT '执行状态',
  error_message TEXT NULL COMMENT '错误信息',
  executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES download_schedules(id) ON DELETE CASCADE,
  INDEX idx_download_schedule_logs_user_id (user_id),
  INDEX idx_download_schedule_logs_schedule_id (schedule_id),
  INDEX idx_download_schedule_logs_executed_at (executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='下载计划执行日志表';

-- =============================================
-- 文件分享表
-- =============================================
CREATE TABLE IF NOT EXISTS file_shares (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  upload_id BIGINT NOT NULL COMMENT '上传文件ID',
  share_token VARCHAR(64) NOT NULL UNIQUE COMMENT '分享令牌',
  share_url VARCHAR(512) NOT NULL COMMENT '分享链接',
  password VARCHAR(255) NULL COMMENT '访问密码（加密）',
  expires_at DATETIME NULL COMMENT '过期时间',
  max_downloads INT NOT NULL DEFAULT 10 COMMENT '最大下载次数（0表示不限）',
  download_count INT NOT NULL DEFAULT 0 COMMENT '已下载次数',
  view_count INT NOT NULL DEFAULT 0 COMMENT '已查看次数',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
  INDEX idx_file_shares_user_id (user_id),
  INDEX idx_file_shares_share_token (share_token),
  INDEX idx_file_shares_is_active (is_active),
  INDEX idx_file_shares_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件分享表';

-- =============================================
-- 文件分享访问日志表
-- =============================================
CREATE TABLE IF NOT EXISTS file_share_access_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  share_id BIGINT NOT NULL COMMENT '分享ID',
  ip_address VARCHAR(50) NULL COMMENT '访问IP',
  user_agent TEXT NULL COMMENT '用户代理',
  access_type ENUM('view', 'download') NOT NULL COMMENT '访问类型',
  accessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
  FOREIGN KEY (share_id) REFERENCES file_shares(id) ON DELETE CASCADE,
  INDEX idx_file_share_access_logs_share_id (share_id),
  INDEX idx_file_share_access_logs_accessed_at (accessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件分享访问日志表';

-- =============================================
-- 工作流表
-- =============================================
CREATE TABLE IF NOT EXISTS workflows (
  id VARCHAR(36) PRIMARY KEY COMMENT '工作流ID（UUID）',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  name VARCHAR(100) NOT NULL COMMENT '工作流名称',
  description TEXT NULL COMMENT '工作流描述',
  trigger_type VARCHAR(50) NOT NULL COMMENT '触发器类型',
  trigger_config JSON NULL COMMENT '触发器配置',
  conditions JSON NULL COMMENT '条件列表',
  actions JSON NULL COMMENT '动作列表',
  enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  execution_count INT NOT NULL DEFAULT 0 COMMENT '执行次数',
  error_count INT NOT NULL DEFAULT 0 COMMENT '错误次数',
  last_executed_at DATETIME NULL COMMENT '上次执行时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_workflows_user_id (user_id),
  INDEX idx_workflows_enabled (enabled),
  INDEX idx_workflows_trigger_type (trigger_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流表';

-- =============================================
-- 工作流执行日志表
-- =============================================
CREATE TABLE IF NOT EXISTS workflow_executions (
  id VARCHAR(36) PRIMARY KEY COMMENT '执行ID（UUID）',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  workflow_id VARCHAR(36) NOT NULL COMMENT '工作流ID',
  status ENUM('running', 'completed', 'failed', 'skipped') NOT NULL DEFAULT 'running' COMMENT '执行状态',
  event_data JSON NULL COMMENT '触发事件数据',
  error_message TEXT NULL COMMENT '错误信息',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
  completed_at DATETIME NULL COMMENT '完成时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  INDEX idx_workflow_executions_user_id (user_id),
  INDEX idx_workflow_executions_workflow_id (workflow_id),
  INDEX idx_workflow_executions_status (status),
  INDEX idx_workflow_executions_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流执行日志表';

-- =============================================
-- 完成提示
-- =============================================
SELECT 'Database schema created successfully!' AS message;
