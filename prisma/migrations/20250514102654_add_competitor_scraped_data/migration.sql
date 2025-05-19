-- CreateTable
CREATE TABLE `competitor_scraped_data` (
    `competitor_scraped_id` VARCHAR(191) NOT NULL,
    `competitor_id` VARCHAR(191) NOT NULL,
    `website_id` VARCHAR(191) NOT NULL,
    `website_url` VARCHAR(191) NOT NULL,
    `page_title` VARCHAR(191) NULL,
    `meta_description` LONGTEXT NULL,
    `meta_keywords` LONGTEXT NULL,
    `og_title` LONGTEXT NULL,
    `og_description` LONGTEXT NULL,
    `og_image` VARCHAR(191) NULL,
    `twitter_handle` VARCHAR(191) NULL,
    `facebook_handle` VARCHAR(191) NULL,
    `instagram_handle` VARCHAR(191) NULL,
    `linkedin_handle` VARCHAR(191) NULL,
    `youtube_handle` VARCHAR(191) NULL,
    `tiktok_handle` VARCHAR(191) NULL,
    `other_links` JSON NULL,
    `raw_html` LONGTEXT NULL,
    `scraped_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `competitor_scraped_data_competitor_id_key`(`competitor_id`),
    PRIMARY KEY (`competitor_scraped_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `competitor_scraped_data` ADD CONSTRAINT `competitor_scraped_data_competitor_id_fkey` FOREIGN KEY (`competitor_id`) REFERENCES `competitor_details`(`competitor_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_scraped_data` ADD CONSTRAINT `competitor_scraped_data_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
