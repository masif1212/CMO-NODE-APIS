/*
  Warnings:

  - You are about to drop the `api_keys` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `authentication_methods` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `competitor_details` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `data_retention_policies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `email_verifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `login_attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `magic_links` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mfa_methods` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `system_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_websites` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `api_keys` DROP FOREIGN KEY `api_keys_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `audit_logs` DROP FOREIGN KEY `audit_logs_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `authentication_methods` DROP FOREIGN KEY `authentication_methods_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `brand_social_media_analysis` DROP FOREIGN KEY `brand_social_media_analysis_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `brand_traffic_analysis` DROP FOREIGN KEY `brand_traffic_analysis_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `brand_website_analysis` DROP FOREIGN KEY `brand_website_analysis_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `competitor_analysis` DROP FOREIGN KEY `competitor_analysis_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `competitor_details` DROP FOREIGN KEY `competitor_details_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `competitor_scraped_data` DROP FOREIGN KEY `competitor_scraped_data_competitor_id_fkey`;

-- DropForeignKey
ALTER TABLE `competitor_scraped_data` DROP FOREIGN KEY `competitor_scraped_data_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `email_verifications` DROP FOREIGN KEY `email_verifications_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `login_attempts` DROP FOREIGN KEY `login_attempts_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `magic_links` DROP FOREIGN KEY `magic_links_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `mfa_methods` DROP FOREIGN KEY `mfa_methods_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `role_permissions` DROP FOREIGN KEY `role_permissions_permission_id_fkey`;

-- DropForeignKey
ALTER TABLE `role_permissions` DROP FOREIGN KEY `role_permissions_role_id_fkey`;

-- DropForeignKey
ALTER TABLE `sessions` DROP FOREIGN KEY `sessions_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_roles` DROP FOREIGN KEY `user_roles_role_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_roles` DROP FOREIGN KEY `user_roles_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_websites` DROP FOREIGN KEY `user_websites_user_id_fkey`;

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
ALTER TABLE `brand_website_analysis` ADD COLUMN `accessibility_score` DOUBLE NULL,
    ADD COLUMN `best_practices_score` DOUBLE NULL,
    ADD COLUMN `pwa_score` DOUBLE NULL;

-- DropTable
DROP TABLE `api_keys`;

-- DropTable
DROP TABLE `audit_logs`;

-- DropTable
DROP TABLE `authentication_methods`;

-- DropTable
DROP TABLE `competitor_details`;

-- DropTable
DROP TABLE `data_retention_policies`;

-- DropTable
DROP TABLE `email_verifications`;

-- DropTable
DROP TABLE `login_attempts`;

-- DropTable
DROP TABLE `magic_links`;

-- DropTable
DROP TABLE `mfa_methods`;

-- DropTable
DROP TABLE `permissions`;

-- DropTable
DROP TABLE `role_permissions`;

-- DropTable
DROP TABLE `roles`;

-- DropTable
DROP TABLE `sessions`;

-- DropTable
DROP TABLE `system_settings`;

-- DropTable
DROP TABLE `user_roles`;

-- DropTable
DROP TABLE `user_websites`;

-- DropTable
DROP TABLE `users`;

-- CreateTable
CREATE TABLE `user` (
    `user_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `is_email_verified` BOOLEAN NOT NULL DEFAULT false,
    `is_mfa_enabled` BOOLEAN NOT NULL DEFAULT false,
    `account_status` ENUM('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_login` DATETIME(3) NULL,
    `deletion_requested_at` DATETIME(3) NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_website` (
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
CREATE TABLE `authentication_method` (
    `auth_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `auth_type` ENUM('password', 'oauth', 'webauthn', 'magiclink') NOT NULL,
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
CREATE TABLE `magic_link` (
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
CREATE TABLE `role` (
    `role_id` VARCHAR(191) NOT NULL,
    `role_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `role_role_name_key`(`role_name`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission` (
    `permission_id` VARCHAR(191) NOT NULL,
    `permission_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permission_permission_name_key`(`permission_name`),
    PRIMARY KEY (`permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permission` (
    `role_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_role` (
    `user_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session` (
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
CREATE TABLE `audit_log` (
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
CREATE TABLE `login_attempt` (
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
CREATE TABLE `mfa_method` (
    `mfa_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `mfa_type` ENUM('totp', 'sms', 'email') NOT NULL,
    `secret` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(191) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`mfa_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verification` (
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
CREATE TABLE `api_key` (
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
CREATE TABLE `system_setting` (
    `setting_id` VARCHAR(191) NOT NULL,
    `setting_key` VARCHAR(191) NOT NULL,
    `setting_value` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `system_setting_setting_key_key`(`setting_key`),
    PRIMARY KEY (`setting_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_retention_policy` (
    `policy_id` VARCHAR(191) NOT NULL,
    `data_type` VARCHAR(191) NOT NULL,
    `retention_period_days` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`policy_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagespeed_audit` (
    `audit_id` VARCHAR(191) NOT NULL,
    `summary_id` VARCHAR(191) NOT NULL,
    `audit_key` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `score` DOUBLE NULL,
    `display_value` VARCHAR(191) NULL,
    `details` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`audit_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competitor_detail` (
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

    UNIQUE INDEX `competitor_detail_website_url_key`(`website_url`),
    PRIMARY KEY (`competitor_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_website` ADD CONSTRAINT `user_website_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authentication_method` ADD CONSTRAINT `authentication_method_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `magic_link` ADD CONSTRAINT `magic_link_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permission`(`permission_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_attempt` ADD CONSTRAINT `login_attempt_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mfa_method` ADD CONSTRAINT `mfa_method_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verification` ADD CONSTRAINT `email_verification_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_key` ADD CONSTRAINT `api_key_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brand_website_analysis` ADD CONSTRAINT `brand_website_analysis_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_website`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagespeed_audit` ADD CONSTRAINT `pagespeed_audit_summary_id_fkey` FOREIGN KEY (`summary_id`) REFERENCES `brand_website_analysis`(`website_analysis_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brand_traffic_analysis` ADD CONSTRAINT `brand_traffic_analysis_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_website`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brand_social_media_analysis` ADD CONSTRAINT `brand_social_media_analysis_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_website`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_analysis` ADD CONSTRAINT `competitor_analysis_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_website`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `website_scraped_data` ADD CONSTRAINT `website_scraped_data_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_website`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_detail` ADD CONSTRAINT `competitor_detail_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `website_scraped_data`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_scraped_data` ADD CONSTRAINT `competitor_scraped_data_competitor_id_fkey` FOREIGN KEY (`competitor_id`) REFERENCES `competitor_detail`(`competitor_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_scraped_data` ADD CONSTRAINT `competitor_scraped_data_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_website`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
