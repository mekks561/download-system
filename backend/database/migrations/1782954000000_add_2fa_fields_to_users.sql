-- =============================================
-- 迁移: add_2fa_fields_to_users
-- 创建时间: 2026-07-02T15:00:00.000Z
-- =============================================

-- 上迁移 (执行)
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL COMMENT '手机号码';
ALTER TABLE users ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否启用两步验证';
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255) NULL COMMENT '两步验证密钥';
ALTER TABLE users ADD COLUMN two_factor_phone VARCHAR(20) NULL COMMENT '绑定的验证手机号';
ALTER TABLE users ADD INDEX idx_phone (phone);

-- 下迁移 (回滚)
ALTER TABLE users DROP COLUMN phone;
ALTER TABLE users DROP COLUMN two_factor_enabled;
ALTER TABLE users DROP COLUMN two_factor_secret;
ALTER TABLE users DROP COLUMN two_factor_phone;
ALTER TABLE users DROP INDEX idx_phone;
