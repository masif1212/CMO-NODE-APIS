/*
  Warnings:

  - You are about to drop the `brand_social_media_analysis` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[report_id]` on the table `analysis_status` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[report_id]` on the table `brand_traffic_analysis` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[report_id]` on the table `brand_website_analysis` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[report_id]` on the table `competitor_details` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[website_id]` on the table `user_requirements` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[report_id]` on the table `website_scraped_data` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `brand_social_media_analysis` DROP FOREIGN KEY `brand_social_media_analysis_report_id_fkey`;

-- AlterTable
ALTER TABLE `user_requirements` ADD COLUMN `facebook_handle` VARCHAR(191) NULL,
    ADD COLUMN `instagram_handle` VARCHAR(191) NULL,
    ADD COLUMN `linkedin_handle` VARCHAR(191) NULL,
    ADD COLUMN `tiktok_handle` VARCHAR(191) NULL,
    ADD COLUMN `twitter_handle` VARCHAR(191) NULL,
    ADD COLUMN `youtube_handle` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `brand_social_media_analysis`;

-- CreateIndex
CREATE UNIQUE INDEX `analysis_status_report_id_key` ON `analysis_status`(`report_id`);

-- CreateIndex
CREATE UNIQUE INDEX `brand_traffic_analysis_report_id_key` ON `brand_traffic_analysis`(`report_id`);

-- CreateIndex
CREATE UNIQUE INDEX `brand_website_analysis_report_id_key` ON `brand_website_analysis`(`report_id`);

-- CreateIndex
CREATE UNIQUE INDEX `competitor_details_report_id_key` ON `competitor_details`(`report_id`);

-- CreateIndex
CREATE UNIQUE INDEX `user_requirements_website_id_key` ON `user_requirements`(`website_id`);

-- CreateIndex
CREATE UNIQUE INDEX `website_scraped_data_report_id_key` ON `website_scraped_data`(`report_id`);
