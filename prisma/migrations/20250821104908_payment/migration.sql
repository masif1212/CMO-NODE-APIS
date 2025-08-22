-- /*
--   Warnings:

--   - You are about to alter the column `amount` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Int`.

-- */
-- -- AlterTable
-- -- ALTER TABLE `payments` ADD COLUMN `detail` JSON NULL,
-- --     ADD COLUMN `report_id` VARCHAR(191) NULL,
-- --     MODIFY `amount` INTEGER NULL;

-- -- CreateTable
-- CREATE TABLE `propmt_templates` (
--     `template_id` VARCHAR(191) NOT NULL,
--     `template_name` VARCHAR(191) NULL,
--     `description` LONGTEXT NULL,
--     `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
--     `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

--     UNIQUE INDEX `propmt_templates_template_name_key`(`template_name`),
--     PRIMARY KEY (`template_id`)
-- ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -- CreateTable
-- CREATE TABLE `_paymentsToreport` (
--     `A` VARCHAR(191) NOT NULL,
--     `B` VARCHAR(191) NOT NULL,

--     UNIQUE INDEX `_paymentsToreport_AB_unique`(`A`, `B`),
--     INDEX `_paymentsToreport_B_index`(`B`)
-- ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -- AddForeignKey
-- ALTER TABLE `_paymentsToreport` ADD CONSTRAINT `_paymentsToreport_A_fkey` FOREIGN KEY (`A`) REFERENCES `payments`(`payment_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- -- AddForeignKey
-- ALTER TABLE `_paymentsToreport` ADD CONSTRAINT `_paymentsToreport_B_fkey` FOREIGN KEY (`B`) REFERENCES `report`(`report_id`) ON DELETE CASCADE ON UPDATE CASCADE;
