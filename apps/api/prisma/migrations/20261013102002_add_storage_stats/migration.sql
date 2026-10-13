-- CreateTable
CREATE TABLE `storage_stats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `total_bytes` BIGINT NOT NULL,
    `download_dir_bytes` BIGINT NOT NULL,
    `upload_dir_bytes` BIGINT NOT NULL,
    `plugin_dir_bytes` BIGINT NOT NULL,
    `db_size_bytes` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
