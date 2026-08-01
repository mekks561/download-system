-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `downloads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `status` ENUM('pending', 'downloading', 'paused', 'completed', 'error', 'cancelled') NOT NULL DEFAULT 'pending',
    `progress` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `downloaded_bytes` BIGINT NOT NULL DEFAULT 0,
    `total_bytes` BIGINT NOT NULL DEFAULT 0,
    `speed` BIGINT NOT NULL DEFAULT 0,
    `resume_position` BIGINT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    INDEX `downloads_user_id_status_idx`(`user_id`, `status`),
    INDEX `downloads_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `uploads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(512) NOT NULL,
    `status` ENUM('pending', 'uploading', 'completed', 'error', 'cancelled') NOT NULL DEFAULT 'pending',
    `progress` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `uploaded_bytes` BIGINT NOT NULL DEFAULT 0,
    `total_bytes` BIGINT NOT NULL DEFAULT 0,
    `speed` BIGINT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    INDEX `uploads_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `path` VARCHAR(512) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `size` BIGINT NOT NULL DEFAULT 0,
    `is_directory` BOOLEAN NOT NULL DEFAULT false,
    `parent_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `files_user_id_parent_id_idx`(`user_id`, `parent_id`),
    UNIQUE INDEX `files_user_id_parent_id_name_key`(`user_id`, `parent_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shares` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `file_id` INTEGER NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `password` VARCHAR(255) NULL,
    `expires_at` DATETIME(3) NULL,
    `download_limit` INTEGER NULL,
    `download_count` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('active', 'disabled', 'expired') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `shares_token_key`(`token`),
    INDEX `shares_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `filename` VARCHAR(255) NULL,
    `cron` VARCHAR(100) NOT NULL,
    `type` ENUM('once', 'daily', 'weekly', 'monthly') NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `last_run_at` DATETIME(3) NULL,
    `next_run_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `schedules_user_id_is_enabled_idx`(`user_id`, `is_enabled`),
    INDEX `schedules_next_run_at_idx`(`next_run_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schedule_id` INTEGER NOT NULL,
    `status` ENUM('running', 'success', 'failed') NOT NULL,
    `message` TEXT NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `finished_at` DATETIME(3) NULL,

    INDEX `schedule_logs_schedule_id_started_at_idx`(`schedule_id`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activities_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `downloads` ADD CONSTRAINT `downloads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `uploads` ADD CONSTRAINT `uploads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `files`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shares` ADD CONSTRAINT `shares_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shares` ADD CONSTRAINT `shares_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_logs` ADD CONSTRAINT `schedule_logs_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `activities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
