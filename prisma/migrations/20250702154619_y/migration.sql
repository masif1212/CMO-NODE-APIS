-- AlterTable
ALTER TABLE `competitor_data` ADD COLUMN `isCrawlable` BOOLEAN NULL;

-- AlterTable
ALTER TABLE `website_scraped_data` ADD COLUMN `isCrawlable` BOOLEAN NULL;
