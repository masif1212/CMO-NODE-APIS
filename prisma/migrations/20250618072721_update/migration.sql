-- AlterTable
ALTER TABLE `brand_social_media_analysis` ADD COLUMN `dailyPostingGraph` JSON NULL;

-- AlterTable
ALTER TABLE `user_requirements` MODIFY `property_id` VARCHAR(191) NULL,
    MODIFY `access_token` LONGTEXT NULL;
