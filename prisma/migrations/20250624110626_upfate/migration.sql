-- AlterTable
ALTER TABLE `competitor_details` MODIFY `competitor_website_url` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `website_scraped_data` MODIFY `page_title` LONGTEXT NULL,
    MODIFY `og_image` LONGTEXT NULL,
    MODIFY `twitter_handle` LONGTEXT NULL,
    MODIFY `facebook_handle` LONGTEXT NULL,
    MODIFY `instagram_handle` LONGTEXT NULL,
    MODIFY `linkedin_handle` LONGTEXT NULL,
    MODIFY `youtube_handle` LONGTEXT NULL,
    MODIFY `status_message` LONGTEXT NULL;
