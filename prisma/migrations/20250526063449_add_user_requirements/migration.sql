-- AlterTable
ALTER TABLE `user_requirements` ADD COLUMN `USP` LONGTEXT NULL,
    ADD COLUMN `fetched_properties` JSON NULL,
    ADD COLUMN `industry` LONGTEXT NULL,
    ADD COLUMN `ip_address` LONGTEXT NULL,
    ADD COLUMN `primary_offering` LONGTEXT NULL,
    ADD COLUMN `refresh_token` LONGTEXT NULL,
    ADD COLUMN `region_of_operation` LONGTEXT NULL,
    ADD COLUMN `session_id` LONGTEXT NULL,
    ADD COLUMN `summary_data` JSON NULL,
    ADD COLUMN `summary_status` VARCHAR(191) NULL,
    ADD COLUMN `target_audience` LONGTEXT NULL,
    ADD COLUMN `target_loacation` LONGTEXT NULL,
    ADD COLUMN `user_agent` LONGTEXT NULL;
