-- School calendar: events and holidays, who they are for, holiday imports, and
-- the school's calendar settings (schools.calendar_config, NULL = defaults).
-- New tables and one nullable column only: existing rows are unchanged.

-- AlterTable
ALTER TABLE `schools` ADD COLUMN `calendar_config` JSON NULL;

-- CreateTable
CREATE TABLE `calendar_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `academic_year_id` INTEGER NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(40) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `is_all_day` BOOLEAN NOT NULL DEFAULT true,
    `start_time` VARCHAR(5) NULL,
    `end_time` VARCHAR(5) NULL,
    `recurrence` VARCHAR(20) NOT NULL DEFAULT 'NONE',
    `recurrence_until` DATE NULL,
    `audience_type` VARCHAR(10) NOT NULL DEFAULT 'ALL',
    `status` VARCHAR(10) NOT NULL DEFAULT 'PUBLISHED',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `source` VARCHAR(255) NULL,
    `source_document` VARCHAR(500) NULL,
    `source_published_date` VARCHAR(20) NULL,
    `applicability` VARCHAR(500) NULL,
    `source_key` VARCHAR(100) NULL,
    `import_id` INTEGER NULL,
    `created_by_id` INTEGER NOT NULL,
    `updated_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `calendar_events_school_id_start_date_end_date_idx`(`school_id`, `start_date`, `end_date`),
    INDEX `calendar_events_school_id_category_idx`(`school_id`, `category`),
    INDEX `calendar_events_school_id_source_key_idx`(`school_id`, `source_key`),
    INDEX `calendar_events_academic_year_id_idx`(`academic_year_id`),
    INDEX `calendar_events_created_by_id_idx`(`created_by_id`),
    INDEX `calendar_events_updated_by_id_idx`(`updated_by_id`),
    INDEX `calendar_events_import_id_idx`(`import_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_event_audiences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `event_id` INTEGER NOT NULL,
    `role_id` INTEGER NULL,
    `class_id` INTEGER NULL,
    `section_id` INTEGER NULL,

    INDEX `calendar_event_audiences_event_id_idx`(`event_id`),
    INDEX `calendar_event_audiences_role_id_idx`(`role_id`),
    INDEX `calendar_event_audiences_class_id_idx`(`class_id`),
    INDEX `calendar_event_audiences_section_id_idx`(`section_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_imports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `calendar_year` INTEGER NOT NULL,
    `source` VARCHAR(255) NOT NULL,
    `source_document` VARCHAR(500) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    `created_count` INTEGER NOT NULL DEFAULT 0,
    `skipped_count` INTEGER NOT NULL DEFAULT 0,
    `imported_by_id` INTEGER NOT NULL,
    `imported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `calendar_imports_school_id_calendar_year_idx`(`school_id`, `calendar_year`),
    INDEX `calendar_imports_imported_by_id_idx`(`imported_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_import_id_fkey` FOREIGN KEY (`import_id`) REFERENCES `calendar_imports`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_event_audiences` ADD CONSTRAINT `calendar_event_audiences_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_event_audiences` ADD CONSTRAINT `calendar_event_audiences_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_event_audiences` ADD CONSTRAINT `calendar_event_audiences_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_event_audiences` ADD CONSTRAINT `calendar_event_audiences_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_imports` ADD CONSTRAINT `calendar_imports_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_imports` ADD CONSTRAINT `calendar_imports_imported_by_id_fkey` FOREIGN KEY (`imported_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

