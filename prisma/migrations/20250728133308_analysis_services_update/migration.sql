/*
  Warnings:

  - You are about to drop the column `dashboard1_rId` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashboard2_rId` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashboard3_rId` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashboard4_rId` on the `report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `analysisservices` ADD COLUMN `report` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `report` DROP COLUMN `dashboard1_rId`,
    DROP COLUMN `dashboard2_rId`,
    DROP COLUMN `dashboard3_rId`,
    DROP COLUMN `dashboard4_rId`;

-- AddForeignKey
ALTER TABLE `analysis_status` ADD CONSTRAINT `analysis_status_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
