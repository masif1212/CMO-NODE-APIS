-- AlterTable
ALTER TABLE `competitor_details` MODIFY `website_url` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `report` ADD COLUMN `dashboard3_socialmedia` JSON NULL;
