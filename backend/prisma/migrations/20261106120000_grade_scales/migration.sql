-- AlterTable
ALTER TABLE `report_cards` ADD COLUMN `grade_scale_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `grade_scales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `pass_percent` DECIMAL(5, 2) NOT NULL DEFAULT 35,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `grade_scales_school_id_idx`(`school_id`),
    UNIQUE INDEX `grade_scales_school_id_name_key`(`school_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grade_bands` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grade_scale_id` INTEGER NOT NULL,
    `min_percent` DECIMAL(5, 2) NOT NULL,
    `max_percent` DECIMAL(5, 2) NOT NULL,
    `grade` VARCHAR(5) NOT NULL,
    `grade_point` DECIMAL(3, 2) NOT NULL,
    `description` VARCHAR(100) NULL,
    `is_passing` BOOLEAN NOT NULL DEFAULT true,

    INDEX `grade_bands_grade_scale_id_idx`(`grade_scale_id`),
    UNIQUE INDEX `grade_bands_grade_scale_id_grade_key`(`grade_scale_id`, `grade`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `report_cards_grade_scale_id_idx` ON `report_cards`(`grade_scale_id`);

-- AddForeignKey
ALTER TABLE `grade_scales` ADD CONSTRAINT `grade_scales_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grade_bands` ADD CONSTRAINT `grade_bands_grade_scale_id_fkey` FOREIGN KEY (`grade_scale_id`) REFERENCES `grade_scales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_cards` ADD CONSTRAINT `report_cards_grade_scale_id_fkey` FOREIGN KEY (`grade_scale_id`) REFERENCES `grade_scales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

