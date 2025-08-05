/*
  Warnings:

  - You are about to alter the column `dashboard2_data` on the `report` table. The data in that column could be lost. The data in that column will be cast from `LongText` to `Json`.

*/
-- AlterTable
ALTER TABLE `report` MODIFY `dashboard2_data` JSON NULL;
