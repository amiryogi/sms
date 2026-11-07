-- Per-school report-card layout (utils/reportCardLayout.js). NULL = original NEB grade sheet.
-- AlterTable
ALTER TABLE `schools` ADD COLUMN `report_card_config` JSON NULL;
