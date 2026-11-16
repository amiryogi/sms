-- AI help assistant: per-school settings (schools.assistant_config) and three new tables:
-- conversations, messages and usage events. New column is nullable and the tables are new,
-- so existing rows are unchanged.

-- AlterTable
ALTER TABLE `schools` ADD COLUMN `assistant_config` JSON NULL;

-- CreateTable
CREATE TABLE `ai_conversations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `language` VARCHAR(5) NOT NULL DEFAULT 'auto',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `last_message_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_conversations_school_id_user_id_last_message_at_idx`(`school_id`, `user_id`, `last_message_at`),
    INDEX `ai_conversations_school_id_last_message_at_idx`(`school_id`, `last_message_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `conversation_id` INTEGER NOT NULL,
    `role` VARCHAR(10) NOT NULL,
    `content` TEXT NOT NULL,
    `route` VARCHAR(200) NULL,
    `module` VARCHAR(50) NULL,
    `language` VARCHAR(5) NULL,
    `sources` JSON NULL,
    `guide_ids` JSON NULL,
    `usage_event_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_messages_conversation_id_id_idx`(`conversation_id`, `id`),
    INDEX `ai_messages_school_id_idx`(`school_id`),
    INDEX `ai_messages_usage_event_id_idx`(`usage_event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_usage_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `role` VARCHAR(20) NOT NULL,
    `provider` VARCHAR(20) NULL,
    `model` VARCHAR(100) NULL,
    `input_tokens` INTEGER NOT NULL DEFAULT 0,
    `output_tokens` INTEGER NOT NULL DEFAULT 0,
    `latency_ms` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL,
    `error_code` VARCHAR(30) NULL,
    `fell_back` BOOLEAN NOT NULL DEFAULT false,
    `language` VARCHAR(5) NULL,
    `module` VARCHAR(50) NULL,
    `feedback` INTEGER NOT NULL DEFAULT 0,
    `feedback_comment` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_usage_events_school_id_created_at_idx`(`school_id`, `created_at`),
    INDEX `ai_usage_events_school_id_user_id_created_at_idx`(`school_id`, `user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_conversations` ADD CONSTRAINT `ai_conversations_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_conversations` ADD CONSTRAINT `ai_conversations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_messages` ADD CONSTRAINT `ai_messages_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_messages` ADD CONSTRAINT `ai_messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_messages` ADD CONSTRAINT `ai_messages_usage_event_id_fkey` FOREIGN KEY (`usage_event_id`) REFERENCES `ai_usage_events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_usage_events` ADD CONSTRAINT `ai_usage_events_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_usage_events` ADD CONSTRAINT `ai_usage_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

