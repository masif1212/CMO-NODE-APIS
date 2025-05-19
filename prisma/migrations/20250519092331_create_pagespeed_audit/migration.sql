-- CreateTable
CREATE TABLE `pagespeed_audit` (
    `id` VARCHAR(191) NOT NULL,
    `website_id` VARCHAR(191) NOT NULL,
    `audit_key` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `score` DOUBLE NULL,
    `display_value` VARCHAR(191) NULL,
    `details` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pagespeed_audit` ADD CONSTRAINT `pagespeed_audit_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
