-- DropIndex
DROP INDEX `competitor_details_website_url_key` ON `competitor_details`;

-- AlterTable
ALTER TABLE `competitor_scraped_data` MODIFY `twitter_handle` LONGTEXT NULL,
    MODIFY `facebook_handle` LONGTEXT NULL,
    MODIFY `instagram_handle` LONGTEXT NULL,
    MODIFY `linkedin_handle` LONGTEXT NULL,
    MODIFY `youtube_handle` LONGTEXT NULL,
    MODIFY `tiktok_handle` LONGTEXT NULL;
