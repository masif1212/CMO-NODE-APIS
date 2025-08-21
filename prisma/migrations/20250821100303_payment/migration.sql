-- CreateTable
CREATE TABLE `_paymentsToreport` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_paymentsToreport_AB_unique`(`A`, `B`),
    INDEX `_paymentsToreport_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_paymentsToreport` ADD CONSTRAINT `_paymentsToreport_A_fkey` FOREIGN KEY (`A`) REFERENCES `payments`(`payment_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_paymentsToreport` ADD CONSTRAINT `_paymentsToreport_B_fkey` FOREIGN KEY (`B`) REFERENCES `report`(`report_id`) ON DELETE CASCADE ON UPDATE CASCADE;
