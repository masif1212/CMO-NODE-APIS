/*
  Warnings:

  - You are about to alter the column `competitor_urls` on the `user_requirements` table. The data in that column could be lost. The data in that column will be cast from `LongText` to `Json`.

*/
-- AlterTable
ALTER TABLE `user_requirements` MODIFY `competitor_urls` JSON NULL;
