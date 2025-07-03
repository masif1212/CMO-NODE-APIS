/*
  Warnings:

  - You are about to drop the column `heading_hierarchy_analysis` on the `competitor_data` table. All the data in the column will be lost.
  - You are about to drop the column `heading_hierarchy_analysis` on the `website_scraped_data` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `competitor_data` DROP COLUMN `heading_hierarchy_analysis`,
    ADD COLUMN `headingAnalysis` JSON NULL;

-- AlterTable
ALTER TABLE `website_scraped_data` DROP COLUMN `heading_hierarchy_analysis`,
    ADD COLUMN `headingAnalysis` JSON NULL;
