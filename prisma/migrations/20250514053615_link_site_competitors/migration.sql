/*
  Warnings:

  - A unique constraint covering the columns `[website_id]` on the table `website_scraped_data` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `competitor_details` DROP FOREIGN KEY `competitor_details_website_id_fkey`;

-- DropIndex
DROP INDEX `competitor_details_website_id_fkey` ON `competitor_details`;

-- CreateIndex
CREATE UNIQUE INDEX `website_scraped_data_website_id_key` ON `website_scraped_data`(`website_id`);

-- AddForeignKey
ALTER TABLE `competitor_details` ADD CONSTRAINT `competitor_details_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `website_scraped_data`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
