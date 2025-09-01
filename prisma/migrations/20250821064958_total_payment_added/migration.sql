-- CreateTable
CREATE TABLE `totalpayment` (
    `id` VARCHAR(191) NOT NULL,
    `report_id` VARCHAR(191) NULL,
    `details` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `total_amount` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `totalpayment` ADD CONSTRAINT `totalpayment_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE CASCADE ON UPDATE CASCADE;
