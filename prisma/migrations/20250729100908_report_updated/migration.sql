/*
  Warnings:

  - You are about to drop the column `dashboard1_Freedata` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashboard2_data` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashboard3_data` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashboard4_data` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `dashboard_paiddata` on the `report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `report` DROP COLUMN `dashboard1_Freedata`,
    DROP COLUMN `dashboard2_data`,
    DROP COLUMN `dashboard3_data`,
    DROP COLUMN `dashboard4_data`,
    DROP COLUMN `dashboard_paiddata`,
    ADD COLUMN `dashborad1_Freedata` LONGTEXT NULL,
    ADD COLUMN `dashborad2_data` LONGTEXT NULL,
    ADD COLUMN `dashborad3_data` LONGTEXT NULL,
    ADD COLUMN `dashborad4_data` LONGTEXT NULL,
    ADD COLUMN `dashborad_paiddata` LONGTEXT NULL;
