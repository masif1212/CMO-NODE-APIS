-- -- DropForeignKey
ALTER TABLE `competitor_details` DROP FOREIGN KEY `competitor_details_report_id_fkey`;

-- -- DropIndex
DROP INDEX `competitor_details_report_id_key` ON `competitor_details`;

-- -- AddForeignKey
-- ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
