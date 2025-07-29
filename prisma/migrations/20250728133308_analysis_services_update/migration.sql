/*
  Warnings:

  - You are about to drop the column `dashborad1_rId` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashborad2_rId` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashborad3_rId` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashborad4_rId` on the `report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `analysisservices` ADD COLUMN `report` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `report` DROP COLUMN `dashborad1_rId`,
    DROP COLUMN `dashborad2_rId`,
    DROP COLUMN `dashborad3_rId`,
    DROP COLUMN `dashborad4_rId`;

-- AddForeignKey
ALTER TABLE `analysis_status` ADD CONSTRAINT `analysis_status_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
