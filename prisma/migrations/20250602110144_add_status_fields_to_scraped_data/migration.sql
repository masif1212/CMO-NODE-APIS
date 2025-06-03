-- AlterTable
ALTER TABLE `website_scraped_data` ADD COLUMN `ip_address` VARCHAR(191) NULL,
    ADD COLUMN `response_time_ms` INTEGER NULL,
    ADD COLUMN `status_code` INTEGER NULL,
    ADD COLUMN `status_message` VARCHAR(191) NULL;
