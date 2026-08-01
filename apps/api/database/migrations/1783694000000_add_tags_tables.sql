-- =============================================
-- 迁移: add_tags_tables
-- 创建时间: 2026-07-12T00:00:00.000Z
-- =============================================

-- 上迁移 (执行)
CREATE TABLE IF NOT EXISTS tags (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  name VARCHAR(50) NOT NULL COMMENT '标签名称',
  color VARCHAR(20) NOT NULL DEFAULT '#ec4899' COMMENT '标签颜色',
  description VARCHAR(255) NULL COMMENT '标签描述',
  usage_count INT NOT NULL DEFAULT 0 COMMENT '使用次数',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_tag_name (user_id, name),
  INDEX idx_user_id (user_id),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表';

CREATE TABLE IF NOT EXISTS file_tags (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  file_id BIGINT NOT NULL COMMENT '文件ID',
  file_type ENUM('download', 'upload', 'file') NOT NULL COMMENT '文件类型',
  tag_id BIGINT NOT NULL COMMENT '标签ID',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE KEY uk_file_tag (file_id, file_type, tag_id),
  INDEX idx_user_id (user_id),
  INDEX idx_file (file_id, file_type),
  INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件标签关联表';

ALTER TABLE downloads ADD COLUMN tag_ids TEXT NULL COMMENT '关联标签ID列表（JSON格式）';
ALTER TABLE uploads ADD COLUMN tag_ids TEXT NULL COMMENT '关联标签ID列表（JSON格式）';

-- 下迁移 (回滚)
ALTER TABLE downloads DROP COLUMN tag_ids;
ALTER TABLE uploads DROP COLUMN tag_ids;
DROP TABLE IF EXISTS file_tags;
DROP TABLE IF EXISTS tags;
