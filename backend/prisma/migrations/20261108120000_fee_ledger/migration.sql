-- Fee ledger (docs/plans/finance-and-portals.md, Phase 3).
-- FeePayment is now FeeObligation in Prisma; the table stays fee_payments.
-- Fee rows are no longer deleted with their enrolment or fee structure (RESTRICT).

-- DropForeignKey
ALTER TABLE `fee_payments` DROP FOREIGN KEY `fee_payments_fee_structure_id_fkey`;

-- DropForeignKey
ALTER TABLE `fee_payments` DROP FOREIGN KEY `fee_payments_student_class_id_fkey`;

-- AlterTable
ALTER TABLE `fee_payments` ADD COLUMN `cancel_reason` VARCHAR(500) NULL,
    ADD COLUMN `cancelled_at` DATETIME(3) NULL,
    ADD COLUMN `cancelled_by_id` INTEGER NULL,
    ADD COLUMN `discount_total` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    MODIFY `status` ENUM('pending', 'partial', 'paid', 'cancelled') NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE `fee_structure_installments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fee_structure_id` INTEGER NOT NULL,
    `sequence` INTEGER NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `due_date` DATE NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `fee_structure_installments_fee_structure_id_sequence_key`(`fee_structure_id`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fee_installments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `obligation_id` INTEGER NOT NULL,
    `sequence` INTEGER NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `due_date` DATE NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `discount_total` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paid_total` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `status` ENUM('pending', 'partial', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `fee_installments_school_id_due_date_idx`(`school_id`, `due_date`),
    INDEX `fee_installments_status_idx`(`status`),
    UNIQUE INDEX `fee_installments_obligation_id_sequence_key`(`obligation_id`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fee_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `student_id` INTEGER NOT NULL,
    `student_class_id` INTEGER NOT NULL,
    `academic_year_id` INTEGER NOT NULL,
    `type` ENUM('PAYMENT', 'REVERSAL') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paid_on` DATE NOT NULL,
    `method` ENUM('cash', 'cheque', 'bank_transfer', 'wallet', 'card') NOT NULL,
    `reference` VARCHAR(100) NULL,
    `remarks` VARCHAR(500) NULL,
    `receipt_number` VARCHAR(40) NOT NULL,
    `fiscal_year` VARCHAR(10) NOT NULL,
    `idempotency_key` VARCHAR(64) NULL,
    `reverses_id` INTEGER NULL,
    `reversal_reason` VARCHAR(500) NULL,
    `reversal_category` ENUM('CORRECTION', 'REFUND') NULL,
    `recorded_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `fee_transactions_reverses_id_key`(`reverses_id`),
    INDEX `fee_transactions_school_id_paid_on_idx`(`school_id`, `paid_on`),
    INDEX `fee_transactions_school_id_student_id_idx`(`school_id`, `student_id`),
    INDEX `fee_transactions_type_idx`(`type`),
    UNIQUE INDEX `fee_transactions_school_id_receipt_number_key`(`school_id`, `receipt_number`),
    UNIQUE INDEX `fee_transactions_school_id_idempotency_key_key`(`school_id`, `idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fee_allocations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaction_id` INTEGER NOT NULL,
    `installment_id` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,

    INDEX `fee_allocations_transaction_id_idx`(`transaction_id`),
    INDEX `fee_allocations_installment_id_idx`(`installment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fee_reversal_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `transaction_id` INTEGER NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `category` ENUM('CORRECTION', 'REFUND') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `requested_by_id` INTEGER NOT NULL,
    `decided_by_id` INTEGER NULL,
    `decided_at` DATETIME(3) NULL,
    `decision_note` VARCHAR(500) NULL,
    `reversal_txn_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fee_reversal_requests_school_id_status_idx`(`school_id`, `status`),
    INDEX `fee_reversal_requests_transaction_id_idx`(`transaction_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fee_discounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `student_id` INTEGER NOT NULL,
    `academic_year_id` INTEGER NOT NULL,
    `fee_type_id` INTEGER NULL,
    `kind` ENUM('FIXED', 'PERCENT') NOT NULL,
    `value` DECIMAL(12, 2) NOT NULL,
    `category` ENUM('DISCOUNT', 'SCHOLARSHIP') NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `requested_by_id` INTEGER NOT NULL,
    `approved_by_id` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `decision_note` VARCHAR(500) NULL,
    `revoked_by_id` INTEGER NULL,
    `revoked_at` DATETIME(3) NULL,
    `revoke_reason` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `fee_discounts_school_id_status_idx`(`school_id`, `status`),
    INDEX `fee_discounts_student_id_academic_year_id_idx`(`student_id`, `academic_year_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fee_discount_applications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `discount_id` INTEGER NOT NULL,
    `installment_id` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,

    INDEX `fee_discount_applications_installment_id_idx`(`installment_id`),
    UNIQUE INDEX `fee_discount_applications_discount_id_installment_id_key`(`discount_id`, `installment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipt_sequences` (
    `school_id` INTEGER NOT NULL,
    `series` VARCHAR(5) NOT NULL,
    `fiscal_year` VARCHAR(10) NOT NULL,
    `next_number` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`school_id`, `series`, `fiscal_year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `fee_payments` ADD CONSTRAINT `fee_payments_student_class_id_fkey` FOREIGN KEY (`student_class_id`) REFERENCES `student_classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_payments` ADD CONSTRAINT `fee_payments_fee_structure_id_fkey` FOREIGN KEY (`fee_structure_id`) REFERENCES `fee_structures`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_payments` ADD CONSTRAINT `fee_payments_cancelled_by_id_fkey` FOREIGN KEY (`cancelled_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_structure_installments` ADD CONSTRAINT `fee_structure_installments_fee_structure_id_fkey` FOREIGN KEY (`fee_structure_id`) REFERENCES `fee_structures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_installments` ADD CONSTRAINT `fee_installments_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_installments` ADD CONSTRAINT `fee_installments_obligation_id_fkey` FOREIGN KEY (`obligation_id`) REFERENCES `fee_payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_transactions` ADD CONSTRAINT `fee_transactions_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_transactions` ADD CONSTRAINT `fee_transactions_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_transactions` ADD CONSTRAINT `fee_transactions_student_class_id_fkey` FOREIGN KEY (`student_class_id`) REFERENCES `student_classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_transactions` ADD CONSTRAINT `fee_transactions_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_transactions` ADD CONSTRAINT `fee_transactions_recorded_by_id_fkey` FOREIGN KEY (`recorded_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_transactions` ADD CONSTRAINT `fee_transactions_reverses_id_fkey` FOREIGN KEY (`reverses_id`) REFERENCES `fee_transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_allocations` ADD CONSTRAINT `fee_allocations_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `fee_transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_allocations` ADD CONSTRAINT `fee_allocations_installment_id_fkey` FOREIGN KEY (`installment_id`) REFERENCES `fee_installments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_reversal_requests` ADD CONSTRAINT `fee_reversal_requests_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_reversal_requests` ADD CONSTRAINT `fee_reversal_requests_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `fee_transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_reversal_requests` ADD CONSTRAINT `fee_reversal_requests_reversal_txn_id_fkey` FOREIGN KEY (`reversal_txn_id`) REFERENCES `fee_transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_reversal_requests` ADD CONSTRAINT `fee_reversal_requests_requested_by_id_fkey` FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_reversal_requests` ADD CONSTRAINT `fee_reversal_requests_decided_by_id_fkey` FOREIGN KEY (`decided_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_discounts` ADD CONSTRAINT `fee_discounts_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_discounts` ADD CONSTRAINT `fee_discounts_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_discounts` ADD CONSTRAINT `fee_discounts_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_discounts` ADD CONSTRAINT `fee_discounts_fee_type_id_fkey` FOREIGN KEY (`fee_type_id`) REFERENCES `fee_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_discounts` ADD CONSTRAINT `fee_discounts_requested_by_id_fkey` FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_discounts` ADD CONSTRAINT `fee_discounts_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_discounts` ADD CONSTRAINT `fee_discounts_revoked_by_id_fkey` FOREIGN KEY (`revoked_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_discount_applications` ADD CONSTRAINT `fee_discount_applications_discount_id_fkey` FOREIGN KEY (`discount_id`) REFERENCES `fee_discounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fee_discount_applications` ADD CONSTRAINT `fee_discount_applications_installment_id_fkey` FOREIGN KEY (`installment_id`) REFERENCES `fee_installments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipt_sequences` ADD CONSTRAINT `receipt_sequences_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- =====================================================================
-- Backfill
-- =====================================================================

-- Every existing fee row becomes an obligation with one installment for the
-- full amount and no due date (the old model had no schedule).
INSERT INTO `fee_installments` (`school_id`, `obligation_id`, `sequence`, `label`, `due_date`, `amount`, `discount_total`, `paid_total`, `status`, `created_at`, `updated_at`)
SELECT fp.`school_id`, fp.`id`, 1, 'Full amount', NULL, fp.`amount_due`, 0, fp.`amount_paid`, fp.`status`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `fee_payments` fp;

-- Money already recorded becomes one ledger PAYMENT per fee row. The old model
-- kept only a running total, so earlier instalments cannot be separated; the
-- whole amount is dated on the last recorded payment date. The old receipt
-- number is kept, and the fiscal year is marked 'legacy' so these numbers never
-- collide with the new per-fiscal-year series. idempotency_key records which
-- fee row each entry came from.
INSERT INTO `fee_transactions` (`school_id`, `student_id`, `student_class_id`, `academic_year_id`, `type`, `amount`, `paid_on`, `method`, `reference`, `remarks`, `receipt_number`, `fiscal_year`, `idempotency_key`, `recorded_by_id`, `created_at`)
SELECT
  fp.`school_id`,
  sc.`student_id`,
  sc.`id`,
  sc.`academic_year_id`,
  'PAYMENT',
  fp.`amount_paid`,
  COALESCE(fp.`payment_date`, DATE(fp.`updated_at`)),
  CASE fp.`payment_method`
    WHEN 'cash' THEN 'cash'
    WHEN 'cheque' THEN 'cheque'
    WHEN 'bank_transfer' THEN 'bank_transfer'
    WHEN 'card' THEN 'card'
    WHEN 'upi' THEN 'wallet'
    WHEN 'wallet' THEN 'wallet'
    ELSE 'cash'
  END,
  NULL,
  LEFT(CONCAT('Migrated from the old fee record', IF(fp.`remarks` IS NULL OR fp.`remarks` = '', '', CONCAT(': ', fp.`remarks`))), 500),
  COALESCE(NULLIF(fp.`receipt_number`, ''), CONCAT('LEGACY-', fp.`id`)),
  'legacy',
  CONCAT('migrated-fee-payment-', fp.`id`),
  COALESCE(fp.`recorded_by_user_id`, fp.`updated_by_user_id`, fp.`created_by_user_id`, (SELECT MIN(u.`id`) FROM `users` u WHERE u.`school_id` = fp.`school_id`)),
  CURRENT_TIMESTAMP(3)
FROM `fee_payments` fp
JOIN `student_classes` sc ON sc.`id` = fp.`student_class_id`
WHERE fp.`amount_paid` > 0;

INSERT INTO `fee_allocations` (`transaction_id`, `installment_id`, `amount`)
SELECT t.`id`, i.`id`, t.`amount`
FROM `fee_transactions` t
JOIN `fee_installments` i
  ON i.`obligation_id` = CAST(SUBSTRING(t.`idempotency_key`, 22) AS UNSIGNED) AND i.`sequence` = 1
WHERE t.`idempotency_key` LIKE 'migrated-fee-payment-%';
