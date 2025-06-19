/*
  Warnings:

  - You are about to drop the column `schema_analysis` on the `brand_website_analysis` table. All the data in the column will be lost.
  - You are about to drop the column `website_url` on the `competitor_details` table. All the data in the column will be lost.
  - You are about to drop the `competitor_scraped_data` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `competitor_scraped_data` DROP FOREIGN KEY `competitor_scraped_data_competitor_id_fkey`;

-- DropForeignKey
ALTER TABLE `competitor_scraped_data` DROP FOREIGN KEY `competitor_scraped_data_website_id_fkey`;

-- AlterTable
ALTER TABLE `brand_website_analysis` DROP COLUMN `schema_analysis`;

-- AlterTable
ALTER TABLE `competitor_details` DROP COLUMN `website_url`,
    ADD COLUMN `competitor_website_url` VARCHAR(191) NULL,
    MODIFY `name` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `website_scraped_data` ADD COLUMN `schema_analysis` JSON NULL;

-- DropTable
DROP TABLE `competitor_scraped_data`;

-- CreateTable
CREATE TABLE `competitor_data` (
    `competitor_scraped_id` VARCHAR(191) NOT NULL,
    `competitor_id` VARCHAR(191) NOT NULL,
    `website_id` VARCHAR(191) NOT NULL,
    `website_url` VARCHAR(191) NOT NULL,
    `page_title` LONGTEXT NULL,
    `meta_description` LONGTEXT NULL,
    `meta_keywords` LONGTEXT NULL,
    `og_title` LONGTEXT NULL,
    `og_description` LONGTEXT NULL,
    `og_image` LONGTEXT NULL,
    `twitter_handle` LONGTEXT NULL,
    `facebook_handle` LONGTEXT NULL,
    `instagram_handle` LONGTEXT NULL,
    `linkedin_handle` LONGTEXT NULL,
    `youtube_handle` LONGTEXT NULL,
    `tiktok_handle` LONGTEXT NULL,
    `ctr_loss_percent` JSON NULL,
    `revenue_loss_percent` INTEGER NULL,
    `sitemap_pages` JSON NULL,
    `schema_analysis` JSON NULL,
    `page_speed` JSON NULL,
    `other_links` JSON NULL,
    `raw_html` LONGTEXT NULL,
    `scraped_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `competitor_data_competitor_id_key`(`competitor_id`),
    PRIMARY KEY (`competitor_scraped_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `competitor_data` ADD CONSTRAINT `competitor_data_competitor_id_fkey` FOREIGN KEY (`competitor_id`) REFERENCES `competitor_details`(`competitor_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_data` ADD CONSTRAINT `competitor_data_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
