/*
  Warnings:

  - You are about to drop the `propmts_templates` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `payments` ADD COLUMN `detail` JSON NULL,
    ADD COLUMN `report_id` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `propmts_templates`;
