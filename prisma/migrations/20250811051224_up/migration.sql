-- AlterTable
ALTER TABLE `brand_social_media_analysis` ADD COLUMN `report_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `brand_traffic_analysis` ADD COLUMN `report_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `brand_website_analysis` ADD COLUMN `report_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `report` MODIFY `website_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `website_scraped_data` ADD COLUMN `report_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `brand_social_media_analysis_report_id_idx` ON `brand_social_media_analysis`(`report_id`);

-- CreateIndex
CREATE INDEX `brand_traffic_analysis_report_id_idx` ON `brand_traffic_analysis`(`report_id`);

-- CreateIndex
CREATE INDEX `brand_website_analysis_report_id_idx` ON `brand_website_analysis`(`report_id`);

-- CreateIndex
CREATE INDEX `website_scraped_data_report_id_idx` ON `website_scraped_data`(`report_id`);

-- AddForeignKey
ALTER TABLE `brand_website_analysis` ADD CONSTRAINT `brand_website_analysis_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brand_traffic_analysis` ADD CONSTRAINT `brand_traffic_analysis_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brand_social_media_analysis` ADD CONSTRAINT `brand_social_media_analysis_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `website_scraped_data` ADD CONSTRAINT `website_scraped_data_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE CASCADE ON UPDATE CASCADE;
