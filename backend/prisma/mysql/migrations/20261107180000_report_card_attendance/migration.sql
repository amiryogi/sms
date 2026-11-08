-- Report-card attendance (utils/reportCardAttendance.js): admin-entered working days
-- per exam, and attendance frozen on each report card at generation.

-- AlterTable
ALTER TABLE `exams` ADD COLUMN `working_days` INTEGER NULL;

-- AlterTable
ALTER TABLE `report_cards` ADD COLUMN `days_late` INTEGER NULL,
    ADD COLUMN `days_present` INTEGER NULL,
    ADD COLUMN `total_working_days` INTEGER NULL;

