-- CreateTable
CREATE TABLE `propmts_templates` (
    `template_id` VARCHAR(191) NOT NULL,
    `template_name` VARCHAR(191) NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `propmts_templates_template_name_key`(`template_name`),
    PRIMARY KEY (`template_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
