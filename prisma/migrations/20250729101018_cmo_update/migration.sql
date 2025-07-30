/*
  Warnings:

  - You are about to drop the column `dashborad1_Freedata` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashborad2_data` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashborad3_data` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashborad4_data` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashborad_paiddata` on the `report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `report` DROP COLUMN `dashborad1_Freedata`,
    DROP COLUMN `dashborad2_data`,
    DROP COLUMN `dashborad3_data`,
    DROP COLUMN `dashborad4_data`,
    DROP COLUMN `dashborad_paiddata`,
    ADD COLUMN `dashboard1_Freedata` LONGTEXT NULL,
    ADD COLUMN `dashboard2_data` LONGTEXT NULL,
    ADD COLUMN `dashboard3_data` LONGTEXT NULL,
    ADD COLUMN `dashboard4_data` LONGTEXT NULL,
    ADD COLUMN `dashboard_paiddata` LONGTEXT NULL;
