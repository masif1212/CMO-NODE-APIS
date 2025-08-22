/*
  Warnings:

  - You are about to drop the `_paymentstoreport` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_paymentstoreport` DROP FOREIGN KEY `_paymentsToreport_A_fkey`;

-- DropForeignKey
ALTER TABLE `_paymentstoreport` DROP FOREIGN KEY `_paymentsToreport_B_fkey`;

-- DropTable
DROP TABLE `_paymentstoreport`;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE SET NULL ON UPDATE CASCADE;
