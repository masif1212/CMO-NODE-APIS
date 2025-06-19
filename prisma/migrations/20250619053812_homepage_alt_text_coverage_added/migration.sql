/*
  Warnings:

  - You are about to drop the column `missing_image_alts` on the `brand_website_analysis` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `brand_website_analysis` DROP COLUMN `missing_image_alts`;

-- AlterTable
ALTER TABLE `website_scraped_data` ADD COLUMN `homepage_alt_text_coverage` VARCHAR(191) NULL;
