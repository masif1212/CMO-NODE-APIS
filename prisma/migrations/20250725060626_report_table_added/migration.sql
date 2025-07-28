/*
  Warnings:

  - You are about to drop the column `website_id` on the `website_scraped_data` table. All the data in the column will be lost.
  - Added the required column `record_id` to the `competitor_data` table without a default value. This is not possible if the table is not empty.
  - Added the required column `record_id` to the `competitor_details` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `analysis_status` DROP FOREIGN KEY `analysis_status_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `brand_social_media_analysis` DROP FOREIGN KEY `brand_social_media_analysis_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `brand_traffic_analysis` DROP FOREIGN KEY `brand_traffic_analysis_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `brand_website_analysis` DROP FOREIGN KEY `brand_website_analysis_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `competitor_data` DROP FOREIGN KEY `competitor_data_competitor_id_fkey`;

-- DropForeignKey
ALTER TABLE `competitor_data` DROP FOREIGN KEY `competitor_data_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `competitor_details` DROP FOREIGN KEY `competitor_details_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `llm_responses` DROP FOREIGN KEY `llm_responses_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `website_scraped_data` DROP FOREIGN KEY `website_scraped_data_website_id_fkey`;

-- DropIndex
DROP INDEX `analysis_status_website_id_fkey` ON `analysis_status`;

-- DropIndex
DROP INDEX `brand_social_media_analysis_website_id_fkey` ON `brand_social_media_analysis`;

-- DropIndex
DROP INDEX `brand_traffic_analysis_website_id_fkey` ON `brand_traffic_analysis`;

-- DropIndex
DROP INDEX `brand_website_analysis_website_id_fkey` ON `brand_website_analysis`;

-- DropIndex
DROP INDEX `competitor_data_website_id_fkey` ON `competitor_data`;

-- DropIndex
DROP INDEX `website_scraped_data_website_id_key` ON `website_scraped_data`;

-- AlterTable
ALTER TABLE `analysis_status` MODIFY `website_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `analysisservices` MODIFY `type` VARCHAR(191) NULL,
    MODIFY `name` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `competitor_data` ADD COLUMN `record_id` VARCHAR(191) NOT NULL,
    MODIFY `competitor_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `competitor_details` ADD COLUMN `record_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `scraped_data_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `llm_responses` MODIFY `website_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `paymentmethods` MODIFY `checkout_source_id` VARCHAR(191) NULL,
    MODIFY `card_type` VARCHAR(191) NULL,
    MODIFY `last4` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `permissions` MODIFY `permission_name` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `roles` MODIFY `role_name` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sessions` MODIFY `token` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `system_settings` MODIFY `setting_key` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `email` VARCHAR(191) NULL,
    MODIFY `account_status` VARCHAR(191) NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE `website_scraped_data` DROP COLUMN `website_id`,
    MODIFY `website_url` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `report` (
    `report_id` VARCHAR(191) NOT NULL,
    `website_id` VARCHAR(191) NOT NULL,
    `website_analysis_id` LONGTEXT NULL,
    `traffic_analysis_id` LONGTEXT NULL,
    `social_media_id` LONGTEXT NULL,
    `competitor_scraped_id` LONGTEXT NULL,
    `competitor_id` LONGTEXT NULL,
    `dashborad1_rId` LONGTEXT NULL,
    `dashborad2_rId` LONGTEXT NULL,
    `dashborad3_rId` LONGTEXT NULL,
    `dashborad4_rId` LONGTEXT NULL,
    `geo_llm` LONGTEXT NULL,
    `scraped_data_id` VARCHAR(191) NULL,
    `dashborad1_Freedata` LONGTEXT NULL,
    `dashborad_paiddata` LONGTEXT NULL,
    `dashborad1_rdata` LONGTEXT NULL,
    `dashborad2_data` LONGTEXT NULL,
    `dashborad2_rdata` LONGTEXT NULL,
    `dashborad3_data` LONGTEXT NULL,
    `dashborad3_rdata` LONGTEXT NULL,
    `dashborad4_data` LONGTEXT NULL,
    `dashborad4_rdata` LONGTEXT NULL,

    PRIMARY KEY (`report_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `competitor_details_scraped_data_id_idx` ON `competitor_details`(`scraped_data_id`);

-- AddForeignKey
ALTER TABLE `competitor_details` ADD CONSTRAINT `competitor_details_scraped_data_id_fkey` FOREIGN KEY (`scraped_data_id`) REFERENCES `website_scraped_data`(`scraped_data_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_data` ADD CONSTRAINT `competitor_data_competitor_id_fkey` FOREIGN KEY (`competitor_id`) REFERENCES `competitor_details`(`competitor_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report` ADD CONSTRAINT `report_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
