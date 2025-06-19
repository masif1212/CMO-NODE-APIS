/*
  Warnings:

  - You are about to alter the column `competitor_analysis` on the `analysis_status` table. The data in that column could be lost. The data in that column will be cast from `TinyInt` to `VarChar(191)`.
  - You are about to alter the column `pagespeed_analysis` on the `analysis_status` table. The data in that column could be lost. The data in that column will be cast from `TinyInt` to `VarChar(191)`.
  - You are about to alter the column `social_media_analysis` on the `analysis_status` table. The data in that column could be lost. The data in that column will be cast from `TinyInt` to `VarChar(191)`.
  - You are about to alter the column `brand_audit` on the `analysis_status` table. The data in that column could be lost. The data in that column will be cast from `TinyInt` to `VarChar(191)`.
  - You are about to alter the column `traffic_analysis` on the `analysis_status` table. The data in that column could be lost. The data in that column will be cast from `TinyInt` to `VarChar(191)`.
  - You are about to alter the column `broken_links` on the `analysis_status` table. The data in that column could be lost. The data in that column will be cast from `TinyInt` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `analysis_status` MODIFY `competitor_analysis` VARCHAR(191) NULL,
    MODIFY `pagespeed_analysis` VARCHAR(191) NULL,
    MODIFY `social_media_analysis` VARCHAR(191) NULL,
    MODIFY `brand_audit` VARCHAR(191) NULL,
    MODIFY `traffic_analysis` VARCHAR(191) NULL,
    MODIFY `broken_links` VARCHAR(191) NULL,
    ALTER COLUMN `created_at` DROP DEFAULT,
    ALTER COLUMN `updated_at` DROP DEFAULT;
