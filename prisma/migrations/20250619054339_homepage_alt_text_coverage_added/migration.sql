/*
  Warnings:

  - You are about to alter the column `homepage_alt_text_coverage` on the `website_scraped_data` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `website_scraped_data` MODIFY `homepage_alt_text_coverage` INTEGER NULL;
