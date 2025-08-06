/*
  Warnings:

  - You are about to alter the column `dashboard2_data` on the `report` table. The data in that column could be lost. The data in that column will be cast from `LongText` to `Json`.
  - You are about to drop the `competitor_data` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id,domain]` on the table `user_websites` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `competitor_data` DROP FOREIGN KEY `competitor_data_competitor_id_fkey`;

-- AlterTable
ALTER TABLE `competitor_details` ADD COLUMN `ctr_loss_percent` JSON NULL,
    ADD COLUMN `facebook_handle` LONGTEXT NULL,
    ADD COLUMN `headingAnalysis` JSON NULL,
    ADD COLUMN `homepage_alt_text_coverage` INTEGER NULL,
    ADD COLUMN `instagram_handle` LONGTEXT NULL,
    ADD COLUMN `isCrawlable` BOOLEAN NULL,
    ADD COLUMN `linkedin_handle` LONGTEXT NULL,
    ADD COLUMN `logo_url` LONGTEXT NULL,
    ADD COLUMN `meta_description` LONGTEXT NULL,
    ADD COLUMN `meta_keywords` LONGTEXT NULL,
    ADD COLUMN `og_description` LONGTEXT NULL,
    ADD COLUMN `og_image` LONGTEXT NULL,
    ADD COLUMN `og_title` LONGTEXT NULL,
    ADD COLUMN `other_links` JSON NULL,
    ADD COLUMN `page_speed` JSON NULL,
    ADD COLUMN `page_title` LONGTEXT NULL,
    ADD COLUMN `raw_html` LONGTEXT NULL,
    ADD COLUMN `revenue_loss_percent` INTEGER NULL,
    ADD COLUMN `schema_analysis` JSON NULL,
    ADD COLUMN `sitemap_pages` JSON NULL,
    ADD COLUMN `social_media_data` JSON NULL,
    ADD COLUMN `tiktok_handle` LONGTEXT NULL,
    ADD COLUMN `twitter_handle` LONGTEXT NULL,
    ADD COLUMN `website_url` VARCHAR(191) NULL,
    ADD COLUMN `youtube_handle` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `report` ADD COLUMN `dashboard3_socialmedia` JSON NULL,
    MODIFY `dashboard2_data` JSON NULL;

-- AlterTable
ALTER TABLE `user_websites` ADD COLUMN `domain` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `competitor_data`;

-- CreateIndex
CREATE UNIQUE INDEX `user_websites_user_id_domain_key` ON `user_websites`(`user_id`, `domain`);
