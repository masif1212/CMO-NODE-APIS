-- CreateTable
CREATE TABLE `users` (
    `user_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `user_type` VARCHAR(191) NULL,
    `is_email_verified` BOOLEAN NOT NULL DEFAULT false,
    `is_mfa_enabled` BOOLEAN NOT NULL DEFAULT false,
    `account_status` VARCHAR(191) NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_login` DATETIME(3) NULL,
    `deletion_requested_at` DATETIME(3) NULL,
    `checkout_customer_id` VARCHAR(191) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_checkout_customer_id_key`(`checkout_customer_id`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `role_id` VARCHAR(191) NOT NULL,
    `role_name` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `roles_role_name_key`(`role_name`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `user_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analysisServices` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `price` DECIMAL(65, 30) NOT NULL,
    `report` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `analysisServices_type_key`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalysisServiceHistory` (
    `id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `price` DECIMAL(65, 30) NOT NULL,
    `valid_from` DATETIME(3) NOT NULL,
    `valid_to` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `paymentMethods` (
    `method_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `checkout_source_id` VARCHAR(191) NULL,
    `card_type` VARCHAR(191) NULL,
    `last4` VARCHAR(191) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `paymentMethods_checkout_source_id_key`(`checkout_source_id`),
    PRIMARY KEY (`method_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `payment_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `report_id` VARCHAR(191) NULL,
    `detail` JSON NULL,
    `amount` INTEGER NULL,
    `currency` VARCHAR(191) NOT NULL,
    `payment_method` VARCHAR(191) NOT NULL,
    `payment_status` VARCHAR(191) NOT NULL,
    `transaction_id` VARCHAR(191) NULL,
    `subscription_id` VARCHAR(191) NULL,
    `website_id` VARCHAR(191) NULL,
    `analysis_type` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_websites` (
    `website_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `website_url` VARCHAR(191) NOT NULL,
    `website_type` VARCHAR(191) NULL,
    `website_name` VARCHAR(191) NULL,
    `domain` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_websites_user_id_domain_key`(`user_id`, `domain`),
    UNIQUE INDEX `user_websites_user_id_website_id_key`(`user_id`, `website_id`),
    PRIMARY KEY (`website_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `authentication_methods` (
    `auth_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `auth_type` VARCHAR(191) NOT NULL,
    `auth_provider_id` VARCHAR(191) NULL,
    `webauthn_credential_id` VARCHAR(191) NULL,
    `public_key` VARCHAR(191) NULL,
    `credential_device_type` VARCHAR(191) NULL,
    `last_used` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`auth_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `magic_links` (
    `magic_link_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`magic_link_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `permission_id` VARCHAR(191) NOT NULL,
    `permission_name` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_permission_name_key`(`permission_name`),
    PRIMARY KEY (`permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `session_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token` LONGTEXT NULL,
    `device_info` JSON NULL,
    `ip_address` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`session_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `log_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `action_type` VARCHAR(191) NOT NULL,
    `resource_affected` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `device_info` JSON NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_attempts` (
    `attempt_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `auth_method` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`attempt_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verifications` (
    `verification_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`verification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `key_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `service_name` VARCHAR(191) NOT NULL,
    `encrypted_key` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revoked_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `setting_id` VARCHAR(191) NOT NULL,
    `setting_key` VARCHAR(191) NULL,
    `setting_value` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `system_settings_setting_key_key`(`setting_key`),
    PRIMARY KEY (`setting_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_retention_policies` (
    `policy_id` VARCHAR(191) NOT NULL,
    `data_type` VARCHAR(191) NOT NULL,
    `retention_period_days` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`policy_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brand_website_analysis` (
    `website_analysis_id` VARCHAR(191) NOT NULL,
    `performance_score` DOUBLE NULL,
    `seo_score` DOUBLE NULL,
    `first_contentful_paint` VARCHAR(191) NULL,
    `largest_contentful_paint` VARCHAR(191) NULL,
    `accessibility_score` DOUBLE NULL,
    `best_practices_score` DOUBLE NULL,
    `best_practices` JSON NULL,
    `pwa_score` DOUBLE NULL,
    `total_blocking_time` VARCHAR(191) NULL,
    `speed_index` VARCHAR(191) NULL,
    `cumulative_layout_shift` VARCHAR(191) NULL,
    `time_to_interactive` VARCHAR(191) NULL,
    `total_broken_links` INTEGER NULL,
    `broken_links` JSON NULL,
    `audit_details` JSON NULL,
    `revenue_loss_percent` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`website_analysis_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brand_traffic_analysis` (
    `traffic_analysis_id` VARCHAR(191) NOT NULL,
    `report_id` VARCHAR(191) NULL,
    `total_visitors` INTEGER NULL,
    `organic_search` INTEGER NULL,
    `direct` INTEGER NULL,
    `referral` INTEGER NULL,
    `organic_social` INTEGER NULL,
    `unassigned` INTEGER NULL,
    `high_bounce_pages` JSON NULL,
    `top_countries` JSON NULL,
    `overall_bounce_rate` DOUBLE NULL,
    `actionable_fix` VARCHAR(191) NULL,
    `daily_active_users` JSON NULL,
    `avg_session_duration` DOUBLE NULL,
    `engagement_rate` DOUBLE NULL,
    `engaged_sessions` INTEGER NULL,
    `top_devices` JSON NULL,
    `top_browsers` JSON NULL,
    `top_sources` JSON NULL,
    `new_vs_returning` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `brand_traffic_analysis_report_id_key`(`report_id`),
    INDEX `brand_traffic_analysis_report_id_idx`(`report_id`),
    PRIMARY KEY (`traffic_analysis_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `website_scraped_data` (
    `scraped_data_id` VARCHAR(191) NOT NULL,
    `report_id` VARCHAR(191) NULL,
    `website_url` VARCHAR(191) NULL,
    `website_name` VARCHAR(191) NULL,
    `H1_text` LONGTEXT NULL,
    `isCrawlable` BOOLEAN NULL,
    `headingAnalysis` JSON NULL,
    `page_title` LONGTEXT NULL,
    `logo_url` LONGTEXT NULL,
    `meta_description` LONGTEXT NULL,
    `meta_keywords` LONGTEXT NULL,
    `og_title` LONGTEXT NULL,
    `og_description` LONGTEXT NULL,
    `og_image` LONGTEXT NULL,
    `twitter_handle` LONGTEXT NULL,
    `facebook_handle` LONGTEXT NULL,
    `instagram_handle` LONGTEXT NULL,
    `linkedin_handle` LONGTEXT NULL,
    `youtube_handle` LONGTEXT NULL,
    `ctr_loss_percent` JSON NULL,
    `homepage_alt_text_coverage` INTEGER NULL,
    `sitemap_pages` JSON NULL,
    `schema_analysis` JSON NULL,
    `tiktok_handle` VARCHAR(191) NULL,
    `other_links` JSON NULL,
    `raw_html` LONGTEXT NULL,
    `ai_response` LONGTEXT NULL,
    `status_code` INTEGER NULL,
    `ip_address` VARCHAR(191) NULL,
    `response_time_ms` INTEGER NULL,
    `status_message` LONGTEXT NULL,
    `scraped_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `website_scraped_data_report_id_key`(`report_id`),
    INDEX `website_scraped_data_report_id_idx`(`report_id`),
    PRIMARY KEY (`scraped_data_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competitor_details` (
    `competitor_id` VARCHAR(191) NOT NULL,
    `website_id` VARCHAR(191) NOT NULL,
    `report_id` VARCHAR(191) NOT NULL,
    `scraped_data_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `website_url` VARCHAR(191) NULL,
    `website_name` VARCHAR(191) NULL,
    `H1_text` LONGTEXT NULL,
    `competitor_website_url` LONGTEXT NULL,
    `industry` LONGTEXT NULL,
    `region` LONGTEXT NULL,
    `target_audience` LONGTEXT NULL,
    `primary_offering` LONGTEXT NULL,
    `usp` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `order_index` INTEGER NULL,
    `isCrawlable` BOOLEAN NULL,
    `page_title` LONGTEXT NULL,
    `logo_url` LONGTEXT NULL,
    `meta_description` LONGTEXT NULL,
    `meta_keywords` LONGTEXT NULL,
    `og_title` LONGTEXT NULL,
    `headingAnalysis` JSON NULL,
    `og_description` LONGTEXT NULL,
    `og_image` LONGTEXT NULL,
    `twitter_handle` LONGTEXT NULL,
    `facebook_handle` LONGTEXT NULL,
    `instagram_handle` LONGTEXT NULL,
    `linkedin_handle` LONGTEXT NULL,
    `homepage_alt_text_coverage` INTEGER NULL,
    `social_media_data` JSON NULL,
    `youtube_handle` LONGTEXT NULL,
    `tiktok_handle` LONGTEXT NULL,
    `ctr_loss_percent` JSON NULL,
    `revenue_loss_percent` INTEGER NULL,
    `sitemap_pages` JSON NULL,
    `schema_analysis` JSON NULL,
    `page_speed` JSON NULL,
    `other_links` JSON NULL,
    `raw_html` LONGTEXT NULL,

    INDEX `competitor_details_website_id_idx`(`website_id`),
    INDEX `competitor_details_website_id_order_index_idx`(`website_id`, `order_index`),
    INDEX `competitor_details_scraped_data_id_idx`(`scraped_data_id`),
    INDEX `competitor_details_report_id_idx`(`report_id`),
    PRIMARY KEY (`competitor_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_requirements` (
    `requirement_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `website_id` VARCHAR(191) NOT NULL,
    `facebook_handle` VARCHAR(191) NULL,
    `instagram_handle` VARCHAR(191) NULL,
    `twitter_handle` VARCHAR(191) NULL,
    `youtube_handle` VARCHAR(191) NULL,
    `linkedin_handle` VARCHAR(191) NULL,
    `tiktok_handle` VARCHAR(191) NULL,
    `ip_address` LONGTEXT NULL,
    `user_agent` LONGTEXT NULL,
    `industry` LONGTEXT NULL,
    `industry_size` LONGTEXT NULL,
    `focus_areas` LONGTEXT NULL,
    `region_of_operation` LONGTEXT NULL,
    `target_location` LONGTEXT NULL,
    `target_audience` LONGTEXT NULL,
    `primary_offering` LONGTEXT NULL,
    `competitor_urls` JSON NULL,
    `USP` LONGTEXT NULL,
    `property_id` VARCHAR(191) NULL,
    `access_token` LONGTEXT NULL,
    `refresh_token` LONGTEXT NULL,
    `profile` JSON NULL,
    `session_id` LONGTEXT NULL,
    `fetched_properties` JSON NULL,
    `summary_status` VARCHAR(191) NULL,
    `summary_data` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_requirements_website_id_key`(`website_id`),
    PRIMARY KEY (`requirement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analysis_status` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `website_id` VARCHAR(191) NULL,
    `report_id` VARCHAR(191) NULL,
    `website_audit` BOOLEAN NULL,
    `trafficanaylsis` BOOLEAN NULL,
    `onpageoptimization` BOOLEAN NULL,
    `offpageoptimization` BOOLEAN NULL,
    `social_media_anaylsis` BOOLEAN NULL,
    `competitors_identification` BOOLEAN NULL,
    `recommendationbymo1` BOOLEAN NULL,
    `strengthandissues_d1` BOOLEAN NULL,
    `recommendationbymo2` BOOLEAN NULL,
    `recommendationbymo3` BOOLEAN NULL,
    `cmo_recommendation` BOOLEAN NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `analysis_status_report_id_key`(`report_id`),
    INDEX `analysis_status_report_id_idx`(`report_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plans` (
    `plan_id` VARCHAR(191) NOT NULL,
    `plan_name` VARCHAR(191) NOT NULL,
    `price` DECIMAL(65, 30) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `features` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`plan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `subscription_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `plan_id` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL,
    `payment_status` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`subscription_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report` (
    `report_id` VARCHAR(191) NOT NULL,
    `website_id` VARCHAR(191) NULL,
    `website_analysis_id` LONGTEXT NULL,
    `traffic_analysis_id` LONGTEXT NULL,
    `onpageoptimization_id` LONGTEXT NULL,
    `social_media_id` LONGTEXT NULL,
    `competitor_scraped_id` LONGTEXT NULL,
    `competitor_id` LONGTEXT NULL,
    `geo_llm` LONGTEXT NULL,
    `scraped_data_id` VARCHAR(191) NULL,
    `dashboard1_Freedata` LONGTEXT NULL,
    `dashboard_paiddata` LONGTEXT NULL,
    `strengthandissues_d1` LONGTEXT NULL,
    `three_burning_issues` LONGTEXT NULL,
    `recommendationbymo1` LONGTEXT NULL,
    `dashboard2_data` JSON NULL,
    `strengthandissues_d2` LONGTEXT NULL,
    `recommendationbymo2` LONGTEXT NULL,
    `dashboard3_data` LONGTEXT NULL,
    `dashboard3_socialmedia` JSON NULL,
    `recommendationbymo3` LONGTEXT NULL,
    `dashboard4_data` LONGTEXT NULL,
    `cmorecommendation` LONGTEXT NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `report_website_id_updated_at_idx`(`website_id`, `updated_at`),
    PRIMARY KEY (`report_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_templates` (
    `template_id` VARCHAR(191) NOT NULL,
    `template_name` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `email_templates_template_name_key`(`template_name`),
    PRIMARY KEY (`template_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `propmt_templates` (
    `template_id` VARCHAR(191) NOT NULL,
    `template_name` VARCHAR(191) NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `propmt_templates_template_name_key`(`template_name`),
    PRIMARY KEY (`template_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cmo_recommendation` (
    `user_id` VARCHAR(191) NULL,
    `id` VARCHAR(191) NOT NULL,
    `report_ids` JSON NULL,
    `cmorecommendation` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalysisServiceHistory` ADD CONSTRAINT `AnalysisServiceHistory_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `analysisServices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `paymentMethods` ADD CONSTRAINT `paymentMethods_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`subscription_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_websites` ADD CONSTRAINT `user_websites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authentication_methods` ADD CONSTRAINT `authentication_methods_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `magic_links` ADD CONSTRAINT `magic_links_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`permission_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_attempts` ADD CONSTRAINT `login_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verifications` ADD CONSTRAINT `email_verifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brand_traffic_analysis` ADD CONSTRAINT `brand_traffic_analysis_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `website_scraped_data` ADD CONSTRAINT `website_scraped_data_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_details` ADD CONSTRAINT `competitor_details_scraped_data_id_fkey` FOREIGN KEY (`scraped_data_id`) REFERENCES `website_scraped_data`(`scraped_data_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_details` ADD CONSTRAINT `competitor_details_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_requirements` ADD CONSTRAINT `user_requirements_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_requirements` ADD CONSTRAINT `user_requirements_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analysis_status` ADD CONSTRAINT `analysis_status_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analysis_status` ADD CONSTRAINT `analysis_status_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analysis_status` ADD CONSTRAINT `analysis_status_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `report`(`report_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`plan_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report` ADD CONSTRAINT `report_website_id_fkey` FOREIGN KEY (`website_id`) REFERENCES `user_websites`(`website_id`) ON DELETE CASCADE ON UPDATE CASCADE;
