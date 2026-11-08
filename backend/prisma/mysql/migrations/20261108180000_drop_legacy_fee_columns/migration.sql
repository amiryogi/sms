-- Phase 8 (migration C): drop the per-row payment columns of fee_payments.
-- Since 20261108120000_fee_ledger every payment lives in fee_transactions
-- (date, receipt number, method, remarks, recorded by), and that migration
-- copied any data these columns held into the ledger. Nothing reads them now.

-- DropForeignKey
ALTER TABLE `fee_payments` DROP FOREIGN KEY `fee_payments_recorded_by_user_id_fkey`;

-- DropIndex
DROP INDEX `fee_payments_payment_date_idx` ON `fee_payments`;

-- AlterTable
ALTER TABLE `fee_payments` DROP COLUMN `payment_date`,
    DROP COLUMN `payment_method`,
    DROP COLUMN `receipt_number`,
    DROP COLUMN `recorded_by_user_id`,
    DROP COLUMN `remarks`;
