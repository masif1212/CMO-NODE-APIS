-- AlterTable
ALTER TABLE `competitor_details` MODIFY `industry` LONGTEXT NULL,
    MODIFY `region` LONGTEXT NULL,
    MODIFY `target_audience` LONGTEXT NULL,
    MODIFY `primary_offering` LONGTEXT NULL,
    MODIFY `usp` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `competitor_scraped_data` MODIFY `page_title` LONGTEXT NULL,
    MODIFY `og_image` LONGTEXT NULL;
