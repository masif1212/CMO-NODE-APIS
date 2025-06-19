-- AlterTable
ALTER TABLE `analysis_status` ADD COLUMN `geo_llm` VARCHAR(191) NULL,
    ADD COLUMN `recommendation_by_cmo` VARCHAR(191) NULL,
    ADD COLUMN `recommendation_by_mo1` VARCHAR(191) NULL,
    ADD COLUMN `recommendation_by_mo2` VARCHAR(191) NULL,
    ADD COLUMN `recommendation_by_mo3` VARCHAR(191) NULL;
