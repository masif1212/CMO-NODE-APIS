/*
  Warnings:

  - You are about to drop the column `competitor_details` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `dashboard1` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `dashboard2` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `dashboard3` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `dashboard4` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `geo_llm` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `recommendation_by_cmo` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `recommendation_by_mo1` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `recommendation_by_mo2` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `recommendation_by_mo3` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `seo_audit` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `social_media_analysis` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to drop the column `technical_seo` on the `analysis_status` table. All the data in the column will be lost.
  - You are about to alter the column `website_audit` on the `analysis_status` table. The data in that column could be lost. The data in that column will be cast from `LongText` to `TinyInt`.
  - You are about to drop the column `record_id` on the `competitor_data` table. All the data in the column will be lost.
  - You are about to drop the column `record_id` on the `competitor_details` table. All the data in the column will be lost.
  - You are about to drop the column `dashborad1_rdata` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashborad2_rdata` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashborad3_rdata` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashborad4_rdata` on the `report` table. All the data in the column will be lost.
  - You are about to drop the `llm_responses` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `report_id` to the `competitor_data` table without a default value. This is not possible if the table is not empty.
  - Added the required column `report_id` to the `competitor_details` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `analysis_status` DROP FOREIGN KEY `analysis_status_user_id_fkey`;

-- DropIndex
DROP INDEX `analysis_status_user_id_website_id_key` ON `analysis_status`;

-- AlterTable
ALTER TABLE `analysis_status` DROP COLUMN `competitor_details`,
    DROP COLUMN `dashboard1`,
    DROP COLUMN `dashboard2`,
    DROP COLUMN `dashboard3`,
    DROP COLUMN `dashboard4`,
    DROP COLUMN `geo_llm`,
    DROP COLUMN `recommendation_by_cmo`,
    DROP COLUMN `recommendation_by_mo1`,
    DROP COLUMN `recommendation_by_mo2`,
    DROP COLUMN `recommendation_by_mo3`,
    DROP COLUMN `seo_audit`,
    DROP COLUMN `social_media_analysis`,
    DROP COLUMN `technical_seo`,
    ADD COLUMN `cmo_recommendation` BOOLEAN NULL,
    ADD COLUMN `competitors_identification` BOOLEAN NULL,
    ADD COLUMN `offpageoptimization` BOOLEAN NULL,
    ADD COLUMN `onpageoptimization` BOOLEAN NULL,
    ADD COLUMN `recommendationbymo1` BOOLEAN NULL,
    ADD COLUMN `recommendationbymo2` BOOLEAN NULL,
    ADD COLUMN `recommendationbymo3` BOOLEAN NULL,
    ADD COLUMN `report_id` VARCHAR(191) NULL,
    ADD COLUMN `social_media_anaylsis` BOOLEAN NULL,
    ADD COLUMN `trafficanaylsis` BOOLEAN NULL,
    MODIFY `website_audit` BOOLEAN NULL;

-- AlterTable
ALTER TABLE `competitor_data` DROP COLUMN `record_id`,
    ADD COLUMN `report_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `competitor_details` DROP COLUMN `record_id`,
    ADD COLUMN `report_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `report` DROP COLUMN `dashborad1_rdata`,
    DROP COLUMN `dashborad2_rdata`,
    DROP COLUMN `dashborad3_rdata`,
    DROP COLUMN `dashborad4_rdata`,
    ADD COLUMN `cmorecommendation` LONGTEXT NULL,
    ADD COLUMN `onpageoptimization_id` LONGTEXT NULL,
    ADD COLUMN `recommendationbymo1` LONGTEXT NULL,
    ADD COLUMN `recommendationbymo2` LONGTEXT NULL,
    ADD COLUMN `recommendationbymo3` LONGTEXT NULL;

-- DropTable
DROP TABLE `llm_responses`;

-- AddForeignKey
-- ALTER TABLE `paymentMethods` ADD CONSTRAINT `paymentMethods_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
