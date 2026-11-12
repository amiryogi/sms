-- Optional middle name for every user (students, parents and staff).
-- Nullable and additive: existing rows are unchanged.

-- AlterTable
ALTER TABLE `users` ADD COLUMN `middle_name` VARCHAR(100) NULL;
