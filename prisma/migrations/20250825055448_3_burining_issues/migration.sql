/*
  Warnings:

  - You are about to drop the `totalpayment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `totalpayment` DROP FOREIGN KEY `totalpayment_report_id_fkey`;

-- AlterTable
ALTER TABLE `report` ADD COLUMN `three_burning_issues` LONGTEXT NULL;

-- DropTable
DROP TABLE `totalpayment`;
