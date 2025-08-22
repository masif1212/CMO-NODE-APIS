-- CreateTable
CREATE TABLE `CmoRecommendationOnReports` (
    `id` VARCHAR(191) NOT NULL,
    `report_id` VARCHAR(191) NOT NULL,
    `cmo_recommendation_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `CmoRecommendationOnReports_report_id_cmo_recommendation_id_key`(`report_id`, `cmo_recommendation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CmoRecommendationOnReports` ADD CONSTRAINT `CmoRecommendationOnReports_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CmoRecommendationOnReports` ADD CONSTRAINT `CmoRecommendationOnReports_cmo_recommendation_id_fkey` FOREIGN KEY (`cmo_recommendation_id`) REFERENCES `cmo_recommendation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
