/*
  Warnings:

  - A unique constraint covering the columns `[user_id,domain]` on the table `user_websites` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `user_websites_user_id_domain_key` ON `user_websites`(`user_id`, `domain`);
