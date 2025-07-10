-- AlterTable
ALTER TABLE `analysis_status` MODIFY `social_media_analysis` LONGTEXT NULL,
    MODIFY `geo_llm` LONGTEXT NULL,
    MODIFY `recommendation_by_cmo` LONGTEXT NULL,
    MODIFY `recommendation_by_mo1` LONGTEXT NULL,
    MODIFY `recommendation_by_mo2` LONGTEXT NULL,
    MODIFY `recommendation_by_mo3` LONGTEXT NULL,
    MODIFY `dashboard1` LONGTEXT NULL,
    MODIFY `dashboard2` LONGTEXT NULL,
    MODIFY `dashboard3` LONGTEXT NULL,
    MODIFY `dashboard4` LONGTEXT NULL,
    MODIFY `seo_audit` LONGTEXT NULL,
    MODIFY `technical_seo` LONGTEXT NULL,
    MODIFY `website_audit` LONGTEXT NULL,
    MODIFY `competitor_details` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `competitor_details` ADD COLUMN `order_index` INTEGER NULL;

-- CreateIndex
CREATE INDEX `competitor_details_website_id_order_index_idx` ON `competitor_details`(`website_id`, `order_index`);

-- RenameIndex
-- ALTER TABLE `competitor_details` RENAME INDEX `competitor_details_website_id_fkey` TO `competitor_details_website_id_idx`;
