/*
  Warnings:

  - The primary key for the `user_websites` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropIndex
-- DROP INDEX `user_websites_website_id_key` ON `user_websites`;

-- AlterTable
ALTER TABLE `user_websites` DROP PRIMARY KEY,
    ADD PRIMARY KEY (`website_id`);
