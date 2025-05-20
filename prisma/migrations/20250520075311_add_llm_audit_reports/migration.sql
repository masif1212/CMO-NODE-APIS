-- CreateTable
CREATE TABLE `llm_audit_reports` (
    `id` VARCHAR(191) NOT NULL,
    `website_id` VARCHAR(191) NOT NULL,
    `pagespeed_report` LONGTEXT NULL,
    `traffic_report` LONGTEXT NULL,
    `broken_links_report` LONGTEXT NULL,
    `social_media_report` LONGTEXT NULL,
    `brand_audit` LONGTEXT NULL,
    `best_practices_report` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `llm_audit_reports_website_id_key`(`website_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `llm_audit_reports` ADD CONSTRAINT `llm_audit_reports_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
