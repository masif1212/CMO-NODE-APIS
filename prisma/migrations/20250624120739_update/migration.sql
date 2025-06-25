/*
  Warnings:

  - You are about to drop the column `logo` on the `competitor_data` table. All the data in the column will be lost.
  - You are about to drop the column `logo` on the `website_scraped_data` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `competitor_data` DROP COLUMN `logo`,
    ADD COLUMN `logo_url` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `website_scraped_data` DROP COLUMN `logo`,
    ADD COLUMN `logo_url` LONGTEXT NULL;
