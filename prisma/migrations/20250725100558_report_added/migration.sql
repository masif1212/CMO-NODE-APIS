/*
  Warnings:

  - You are about to drop the column `website_id` on the `brand_social_media_analysis` table. All the data in the column will be lost.
  - You are about to drop the column `website_id` on the `brand_traffic_analysis` table. All the data in the column will be lost.
  - You are about to drop the column `website_id` on the `brand_website_analysis` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `brand_social_media_analysis` DROP COLUMN `website_id`;

-- AlterTable
ALTER TABLE `brand_traffic_analysis` DROP COLUMN `website_id`;

-- AlterTable
ALTER TABLE `brand_website_analysis` DROP COLUMN `website_id`;

-- AlterTable
ALTER TABLE `report` ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE INDEX `report_website_id_updated_at_idx` ON `report`(`website_id`, `updated_at`);

-- AddForeignKey
ALTER TABLE `analysis_status` ADD CONSTRAINT `analysis_status_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE SET NULL ON UPDATE CASCADE;
