/*
  Warnings:

  - You are about to drop the `cmorecommendationonreports` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `cmorecommendationonreports` DROP FOREIGN KEY `CmoRecommendationOnReports_cmo_recommendation_id_fkey`;

-- DropForeignKey
ALTER TABLE `cmorecommendationonreports` DROP FOREIGN KEY `CmoRecommendationOnReports_report_id_fkey`;

-- DropTable
DROP TABLE `cmorecommendationonreports`;
