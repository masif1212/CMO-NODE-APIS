/*
  Warnings:

  - You are about to drop the column `target_loacation` on the `user_requirements` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user_requirements` DROP COLUMN `target_loacation`,
    ADD COLUMN `target_location` LONGTEXT NULL;
