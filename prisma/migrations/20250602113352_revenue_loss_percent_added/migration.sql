/*
  Warnings:

  - You are about to drop the column `geo_llm` on the `brand_website_analysis` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `brand_website_analysis` DROP COLUMN `geo_llm`,
    ADD COLUMN `revenue_loss_percent` DOUBLE NULL;
