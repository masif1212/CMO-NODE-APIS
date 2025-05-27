/*
  Warnings:

  - Added the required column `competitor_analysis_ps_report` to the `llm_audit_reports` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `competitor_details_website_url_key` ON `competitor_details`;

-- AlterTable
ALTER TABLE `competitor_scraped_data` ADD COLUMN `page_speed` JSON NULL,
    MODIFY `twitter_handle` LONGTEXT NULL,
    MODIFY `facebook_handle` LONGTEXT NULL,
    MODIFY `instagram_handle` LONGTEXT NULL,
    MODIFY `linkedin_handle` LONGTEXT NULL,
    MODIFY `youtube_handle` LONGTEXT NULL,
    MODIFY `tiktok_handle` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `llm_audit_reports` ADD COLUMN `competitor_analysis_ps_report` LONGTEXT NOT NULL;

-- CreateTable
CREATE TABLE `user_requirements` (
    `requirement_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `website_id` VARCHAR(191) NOT NULL,
    `property_id` VARCHAR(191) NOT NULL,
    `access_token` LONGTEXT NOT NULL,
    `refresh_token` LONGTEXT NULL,
    `profile` JSON NULL,
    `session_id` LONGTEXT NULL,
    `fetched_properties` JSON NULL,
    `summary_status` VARCHAR(191) NULL,
    `summary_data` JSON NULL,
    `competitor_urls` LONGTEXT NULL,
    `ip_address` LONGTEXT NULL,
    `user_agent` LONGTEXT NULL,
    `industry` LONGTEXT NULL,
    `region_of_operation` LONGTEXT NULL,
    `target_location` LONGTEXT NULL,
    `target_audience` LONGTEXT NULL,
    `primary_offering` LONGTEXT NULL,
    `USP` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`requirement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analysis_status` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `website_id` VARCHAR(191) NOT NULL,
    `competitor_analysis` BOOLEAN NOT NULL DEFAULT false,
    `pagespeed_analysis` BOOLEAN NOT NULL DEFAULT false,
    `social_media_analysis` BOOLEAN NOT NULL DEFAULT false,
    `brand_audit` BOOLEAN NOT NULL DEFAULT false,
    `traffic_analysis` BOOLEAN NOT NULL DEFAULT false,
    `broken_links` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `analysis_status_user_id_website_id_key`(`user_id`, `website_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_requirements` ADD CONSTRAINT `user_requirements_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_requirements` ADD CONSTRAINT `user_requirements_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analysis_status` ADD CONSTRAINT `analysis_status_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analysis_status` ADD CONSTRAINT `analysis_status_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
