-- CreateTable
CREATE TABLE `geo_policies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pattern` VARCHAR(255) NOT NULL,
    `region` VARCHAR(100) NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `is_hard_limit` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `geo_policies_pattern_key`(`pattern`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
