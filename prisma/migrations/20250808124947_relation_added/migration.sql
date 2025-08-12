-- DropForeignKey
ALTER TABLE `analysis_status` DROP FOREIGN KEY `analysis_status_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `api_keys` DROP FOREIGN KEY `api_keys_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `authentication_methods` DROP FOREIGN KEY `authentication_methods_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `email_verifications` DROP FOREIGN KEY `email_verifications_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `login_attempts` DROP FOREIGN KEY `login_attempts_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `magic_links` DROP FOREIGN KEY `magic_links_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `mfa_methods` DROP FOREIGN KEY `mfa_methods_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `paymentmethods` DROP FOREIGN KEY `paymentMethods_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `payments` DROP FOREIGN KEY `payments_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `report` DROP FOREIGN KEY `report_website_id_fkey`;

-- DropForeignKey
ALTER TABLE `sessions` DROP FOREIGN KEY `sessions_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `subscriptions` DROP FOREIGN KEY `subscriptions_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_requirements` DROP FOREIGN KEY `user_requirements_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_roles` DROP FOREIGN KEY `user_roles_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_websites` DROP FOREIGN KEY `user_websites_user_id_fkey`;

-- DropIndex
DROP INDEX `analysis_status_user_id_fkey` ON `analysis_status`;

-- DropIndex
DROP INDEX `api_keys_user_id_fkey` ON `api_keys`;

-- DropIndex
DROP INDEX `authentication_methods_user_id_fkey` ON `authentication_methods`;

-- DropIndex
DROP INDEX `email_verifications_user_id_fkey` ON `email_verifications`;

-- DropIndex
DROP INDEX `login_attempts_user_id_fkey` ON `login_attempts`;

-- DropIndex
DROP INDEX `magic_links_user_id_fkey` ON `magic_links`;

-- DropIndex
DROP INDEX `mfa_methods_user_id_fkey` ON `mfa_methods`;

-- DropIndex
DROP INDEX `paymentMethods_user_id_fkey` ON `paymentmethods`;

-- DropIndex
DROP INDEX `payments_user_id_fkey` ON `payments`;

-- DropIndex
DROP INDEX `sessions_user_id_fkey` ON `sessions`;

-- DropIndex
DROP INDEX `subscriptions_user_id_fkey` ON `subscriptions`;

-- DropIndex
DROP INDEX `user_requirements_user_id_fkey` ON `user_requirements`;

-- CreateIndex
CREATE INDEX `analysis_status_report_id_idx` ON `analysis_status`(`report_id`);

-- CreateIndex
CREATE INDEX `competitor_details_report_id_idx` ON `competitor_details`(`report_id`);

-- AddForeignKey
ALTER TABLE `paymentMethods` ADD CONSTRAINT `paymentMethods_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_websites` ADD CONSTRAINT `user_websites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authentication_methods` ADD CONSTRAINT `authentication_methods_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `magic_links` ADD CONSTRAINT `magic_links_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_attempts` ADD CONSTRAINT `login_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mfa_methods` ADD CONSTRAINT `mfa_methods_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verifications` ADD CONSTRAINT `email_verifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_details` ADD CONSTRAINT `competitor_details_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_requirements` ADD CONSTRAINT `user_requirements_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analysis_status` ADD CONSTRAINT `analysis_status_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analysis_status` ADD CONSTRAINT `analysis_status_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report` ADD CONSTRAINT `report_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE CASCADE ON UPDATE CASCADE;
