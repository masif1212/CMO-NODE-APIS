/*
  Warnings:

  - Added the required column `strengthandissues_d1` to the `report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `strengthandissues_d2` to the `report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `report` ADD COLUMN `strengthandissues_d1` LONGTEXT NOT NULL,
    ADD COLUMN `strengthandissues_d2` LONGTEXT NOT NULL;
