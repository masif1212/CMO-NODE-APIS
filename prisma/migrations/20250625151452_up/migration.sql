/*
  Warnings:

  - You are about to drop the column `brand_audit` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `broken_links` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `pagespeed_analysis` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `traffic_analysis` on the `analysis_status` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `analysis_status` DROP COLUMN `brand_audit`,
    DROP COLUMN `broken_links`,
    DROP COLUMN `pagespeed_analysis`,
    DROP COLUMN `traffic_analysis`,
    ADD COLUMN `seo_audit` VARCHAR(191) NULL,
    ADD COLUMN `technical_seo` VARCHAR(191) NULL,
    ADD COLUMN `website_audit` VARCHAR(191) NULL;
