/*
  Warnings:

  - You are about to drop the `website_audits` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `website_audits` DROP FOREIGN KEY `website_audits_website_id_fkey`;

-- AlterTable
ALTER TABLE `brand_website_analysis` ADD COLUMN `best_practices_score` DOUBLE NULL,
    ADD COLUMN `pwa_score` DOUBLE NULL;

-- DropTable
DROP TABLE `website_audits`;
