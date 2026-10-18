-- AlterTable: 工业化 2.0 语义搜索/AI 分类等功能在下载记录上存放扩展元数据
ALTER TABLE `downloads` ADD COLUMN `metadata` JSON NULL;

-- AlterTable: 用户存储配额（默认 10 GiB）
ALTER TABLE `users` ADD COLUMN `storage_quota` BIGINT NOT NULL DEFAULT 10737418240;
