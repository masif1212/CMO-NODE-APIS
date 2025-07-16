/*
  Warnings:

  - The primary key for the `user_websites` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[checkout_customer_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `payments` DROP FOREIGN KEY `payments_website_id_fkey`;

-- DropIndex
DROP INDEX `payments_website_id_fkey` ON `payments`;

-- AlterTable
ALTER TABLE `user_websites` DROP PRIMARY KEY,
    ADD PRIMARY KEY (`user_id`);

-- AlterTable
ALTER TABLE `users` ADD COLUMN `checkout_customer_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `analysisServices` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` DECIMAL(65, 30) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `analysisServices_type_key`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `paymentMethods` (
    `method_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `checkout_source_id` VARCHAR(191) NOT NULL,
    `card_type` VARCHAR(191) NOT NULL,
    `last4` VARCHAR(191) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `paymentMethods_checkout_source_id_key`(`checkout_source_id`),
    PRIMARY KEY (`method_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `users_checkout_customer_id_key` ON `users`(`checkout_customer_id`);

-- AddForeignKey
ALTER TABLE `paymentMethods` ADD CONSTRAINT `paymentMethods_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
