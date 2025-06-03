-- AlterTable
ALTER TABLE `brand_traffic_analysis` ADD COLUMN `avg_session_duration` DOUBLE NULL,
    ADD COLUMN `engaged_sessions` INTEGER NULL,
    ADD COLUMN `engagement_rate` DOUBLE NULL,
    ADD COLUMN `top_browsers` JSON NULL,
    ADD COLUMN `top_devices` JSON NULL,
    ADD COLUMN `top_sources` JSON NULL;
