/*
  Warnings:

  - You are about to drop the `mfa_methods` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `mfa_methods` DROP FOREIGN KEY `mfa_methods_user_id_fkey`;

-- AlterTable
ALTER TABLE `website_scraped_data` ADD COLUMN `H1_text` LONGTEXT NULL;

-- DropTable
DROP TABLE `mfa_methods`;
