/*
  Warnings:

  - You are about to drop the column `report_id` on the `brand_website_analysis` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `brand_website_analysis` DROP FOREIGN KEY `brand_website_analysis_report_id_fkey`;

-- DropIndex
DROP INDEX `brand_website_analysis_report_id_idx` ON `brand_website_analysis`;

-- DropIndex
DROP INDEX `brand_website_analysis_report_id_key` ON `brand_website_analysis`;

-- AlterTable
ALTER TABLE `brand_website_analysis` DROP COLUMN `report_id`;
