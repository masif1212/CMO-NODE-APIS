/*
  Warnings:

  - You are about to drop the column `accessibility_score` on the `brand_website_analysis` table. All the data in the column will be lost.
  - You are about to drop the column `best_practices_score` on the `brand_website_analysis` table. All the data in the column will be lost.
  - You are about to drop the column `pwa_score` on the `brand_website_analysis` table. All the data in the column will be lost.
  - You are about to drop the `api_key` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `audit_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `authentication_method` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `competitor_detail` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `data_retention_policy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `email_verification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `login_attempt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `magic_link` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mfa_method` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pagespeed_audit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `system_setting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_website` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `api_key` DROP FOREIGN KEY `api_key_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `audit_log` DROP FOREIGN KEY `audit_log_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `authentication_method` DROP FOREIGN KEY `authentication_method_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brand_social_media_analysis` DROP FOREIGN KEY `brand_social_media_analysis_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `brand_traffic_analysis` DROP FOREIGN KEY `brand_traffic_analysis_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `brand_website_analysis` DROP FOREIGN KEY `brand_website_analysis_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `competitor_analysis` DROP FOREIGN KEY `competitor_analysis_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `competitor_detail` DROP FOREIGN KEY `competitor_detail_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `competitor_scraped_data` DROP FOREIGN KEY `competitor_scraped_data_competitor_id_fkey`;

-- DropForeignKey
ALTER TABLE `competitor_scraped_data` DROP FOREIGN KEY `competitor_scraped_data_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `email_verification` DROP FOREIGN KEY `email_verification_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `login_attempt` DROP FOREIGN KEY `login_attempt_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `magic_link` DROP FOREIGN KEY `magic_link_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `mfa_method` DROP FOREIGN KEY `mfa_method_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `pagespeed_audit` DROP FOREIGN KEY `pagespeed_audit_summary_id_fkey`;

-- DropForeignKey
ALTER TABLE `role_permission` DROP FOREIGN KEY `role_permission_permission_id_fkey`;

-- DropForeignKey
ALTER TABLE `role_permission` DROP FOREIGN KEY `role_permission_role_id_fkey`;

-- DropForeignKey
ALTER TABLE `session` DROP FOREIGN KEY `session_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_role` DROP FOREIGN KEY `user_role_role_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_role` DROP FOREIGN KEY `user_role_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_website` DROP FOREIGN KEY `user_website_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `website_scraped_data` DROP FOREIGN KEY `website_scraped_data_website_id_fkey`;

-- DropIndex
DROP INDEX `brand_social_media_analysis_website_id_fkey` ON `brand_social_media_analysis`;

-- DropIndex
DROP INDEX `brand_traffic_analysis_website_id_fkey` ON `brand_traffic_analysis`;

-- DropIndex
DROP INDEX `brand_website_analysis_website_id_fkey` ON `brand_website_analysis`;

-- DropIndex
DROP INDEX `competitor_analysis_website_id_fkey` ON `competitor_analysis`;

-- DropIndex
DROP INDEX `competitor_scraped_data_website_id_fkey` ON `competitor_scraped_data`;

-- AlterTable
ALTER TABLE `brand_website_analysis` DROP COLUMN `accessibility_score`,
    DROP COLUMN `best_practices_score`,
    DROP COLUMN `pwa_score`;

-- DropTable
DROP TABLE `api_key`;

-- DropTable
DROP TABLE `audit_log`;

-- DropTable
DROP TABLE `authentication_method`;

-- DropTable
DROP TABLE `competitor_detail`;

-- DropTable
DROP TABLE `data_retention_policy`;

-- DropTable
DROP TABLE `email_verification`;

-- DropTable
DROP TABLE `login_attempt`;

-- DropTable
DROP TABLE `magic_link`;

-- DropTable
DROP TABLE `mfa_method`;

-- DropTable
DROP TABLE `pagespeed_audit`;

-- DropTable
DROP TABLE `permission`;

-- DropTable
DROP TABLE `role`;

-- DropTable
DROP TABLE `role_permission`;

-- DropTable
DROP TABLE `session`;

-- DropTable
DROP TABLE `system_setting`;

-- DropTable
DROP TABLE `user`;

-- DropTable
DROP TABLE `user_role`;

-- DropTable
DROP TABLE `user_website`;

-- CreateTable
CREATE TABLE `users` (
    `user_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `is_email_verified` BOOLEAN NOT NULL DEFAULT false,
    `is_mfa_enabled` BOOLEAN NOT NULL DEFAULT false,
    `account_status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_login` DATETIME(3) NULL,
    `deletion_requested_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_websites` (
    `website_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `website_url` VARCHAR(191) NOT NULL,
    `website_type` VARCHAR(191) NULL,
    `website_name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`website_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `authentication_methods` (
    `auth_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `auth_type` VARCHAR(191) NOT NULL,
    `auth_provider_id` VARCHAR(191) NULL,
    `webauthn_credential_id` VARCHAR(191) NULL,
    `public_key` VARCHAR(191) NULL,
    `credential_device_type` VARCHAR(191) NULL,
    `last_used` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`auth_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `magic_links` (
    `magic_link_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`magic_link_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `role_id` VARCHAR(191) NOT NULL,
    `role_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `roles_role_name_key`(`role_name`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `permission_id` VARCHAR(191) NOT NULL,
    `permission_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_permission_name_key`(`permission_name`),
    PRIMARY KEY (`permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `user_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `session_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token` LONGTEXT NOT NULL,
    `device_info` JSON NULL,
    `ip_address` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`session_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `log_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `action_type` VARCHAR(191) NOT NULL,
    `resource_affected` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `device_info` JSON NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_attempts` (
    `attempt_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `auth_method` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`attempt_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mfa_methods` (
    `mfa_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `mfa_type` VARCHAR(191) NOT NULL,
    `secret` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(191) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`mfa_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verifications` (
    `verification_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`verification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `key_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `service_name` VARCHAR(191) NOT NULL,
    `encrypted_key` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revoked_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `setting_id` VARCHAR(191) NOT NULL,
    `setting_key` VARCHAR(191) NOT NULL,
    `setting_value` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `system_settings_setting_key_key`(`setting_key`),
    PRIMARY KEY (`setting_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_retention_policies` (
    `policy_id` VARCHAR(191) NOT NULL,
    `data_type` VARCHAR(191) NOT NULL,
    `retention_period_days` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`policy_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competitor_details` (
    `competitor_id` VARCHAR(191) NOT NULL,
    `website_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `website_url` VARCHAR(191) NOT NULL,
    `industry` VARCHAR(191) NULL,
    `region` VARCHAR(191) NULL,
    `target_audience` VARCHAR(191) NULL,
    `primary_offering` VARCHAR(191) NULL,
    `usp` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `competitor_details_website_url_key`(`website_url`),
    PRIMARY KEY (`competitor_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_websites` ADD CONSTRAINT `user_websites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authentication_methods` ADD CONSTRAINT `authentication_methods_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `magic_links` ADD CONSTRAINT `magic_links_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`permission_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_attempts` ADD CONSTRAINT `login_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mfa_methods` ADD CONSTRAINT `mfa_methods_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verifications` ADD CONSTRAINT `email_verifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brand_website_analysis` ADD CONSTRAINT `brand_website_analysis_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brand_traffic_analysis` ADD CONSTRAINT `brand_traffic_analysis_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brand_social_media_analysis` ADD CONSTRAINT `brand_social_media_analysis_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_analysis` ADD CONSTRAINT `competitor_analysis_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `website_scraped_data` ADD CONSTRAINT `website_scraped_data_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_details` ADD CONSTRAINT `competitor_details_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `website_scraped_data`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_scraped_data` ADD CONSTRAINT `competitor_scraped_data_competitor_id_fkey` FOREIGN KEY (`competitor_id`) REFERENCES `competitor_details`(`competitor_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_scraped_data` ADD CONSTRAINT `competitor_scraped_data_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
