/*
  Warnings:

  - You are about to drop the column `competitor_analysis` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `competitor_analysis_ps_report` on the `llm_responses` table. All the data in the column will be lost.
  - You are about to drop the column `competitor_analysis_social_media_report` on the `llm_responses` table. All the data in the column will be lost.
  - You are about to drop the `competitor_analysis` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `competitor_analysis` DROP FOREIGN KEY `competitor_analysis_website_id_fkey`;

-- AlterTable
ALTER TABLE `analysis_status` DROP COLUMN `competitor_analysis`,
    ADD COLUMN `competitor_details` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `llm_responses` DROP COLUMN `competitor_analysis_ps_report`,
    DROP COLUMN `competitor_analysis_social_media_report`,
    ADD COLUMN `competitor_ps_report` LONGTEXT NULL,
    ADD COLUMN `competitor_social_media_report` LONGTEXT NULL;

-- DropTable
DROP TABLE `competitor_analysis`;
