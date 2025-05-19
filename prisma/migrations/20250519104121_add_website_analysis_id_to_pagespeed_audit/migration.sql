/*
  Warnings:

  - Added the required column `website_analysis_id` to the `pagespeed_audit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `pagespeed_audit` ADD COLUMN `website_analysis_id` VARCHAR(191) NOT NULL;
