-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'suspended');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "StudentClassStatus" AS ENUM ('active', 'transferred', 'graduated', 'dropped');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'late', 'excused');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('unit_test', 'midterm', 'final', 'board');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('submitted', 'late', 'graded', 'returned');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('promoted', 'detained', 'graduated');

-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('father', 'mother', 'guardian');

-- CreateEnum
CREATE TYPE "TargetAudience" AS ENUM ('all', 'students', 'parents', 'teachers');

-- CreateEnum
CREATE TYPE "NoticePriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NoticeTargetType" AS ENUM ('GLOBAL', 'ROLE_SPECIFIC', 'CLASS_SPECIFIC');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'LOCKED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'partial', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "FeeTxnType" AS ENUM ('PAYMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'cheque', 'bank_transfer', 'wallet', 'card');

-- CreateEnum
CREATE TYPE "DiscountKind" AS ENUM ('FIXED', 'PERCENT');

-- CreateEnum
CREATE TYPE "DiscountCategory" AS ENUM ('DISCOUNT', 'SCHOLARSHIP');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ReversalCategory" AS ENUM ('CORRECTION', 'REFUND');

-- CreateEnum
CREATE TYPE "SubjectAuditAction" AS ENUM ('CREATE', 'UPDATE', 'LOCK', 'DELETE');

-- CreateTable
CREATE TABLE "schools" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "address" TEXT,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "logo_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tagline" VARCHAR(500),
    "website" VARCHAR(255),
    "banner_url" VARCHAR(500),
    "landline_number" VARCHAR(30),
    "facebook_url" VARCHAR(500),
    "instagram_url" VARCHAR(500),
    "youtube_url" VARCHAR(500),
    "principal_name" VARCHAR(255),
    "established_year" INTEGER,
    "brand_color" VARCHAR(7),
    "report_card_config" JSONB,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_scales" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "pass_percent" DECIMAL(5,2) NOT NULL DEFAULT 35,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_bands" (
    "id" SERIAL NOT NULL,
    "grade_scale_id" INTEGER NOT NULL,
    "min_percent" DECIMAL(5,2) NOT NULL,
    "max_percent" DECIMAL(5,2) NOT NULL,
    "grade" VARCHAR(5) NOT NULL,
    "grade_point" DECIMAL(3,2) NOT NULL,
    "description" VARCHAR(100),
    "is_passing" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "grade_bands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "avatar_url" VARCHAR(500),
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "grade_level" INTEGER NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "name" VARCHAR(10) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 40,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "credit_hours" DECIMAL(3,1) NOT NULL DEFAULT 3.0,
    "has_practical" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_subjects" (
    "id" SERIAL NOT NULL,
    "class_id" INTEGER NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "has_theory" BOOLEAN NOT NULL DEFAULT true,
    "has_practical" BOOLEAN NOT NULL DEFAULT false,
    "full_marks" INTEGER NOT NULL DEFAULT 100,
    "pass_marks" INTEGER NOT NULL DEFAULT 40,
    "theory_marks" INTEGER NOT NULL DEFAULT 100,
    "practical_marks" INTEGER NOT NULL DEFAULT 0,
    "credit_hours" DECIMAL(3,1) NOT NULL DEFAULT 3.0,
    "theory_credit_hours" DECIMAL(4,2) DEFAULT 0,
    "practical_credit_hours" DECIMAL(4,2) DEFAULT 0,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_subjects" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "class_subject_id" INTEGER NOT NULL,
    "section_id" INTEGER NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "is_class_teacher" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL DEFAULT 1,
    "admission_number" VARCHAR(50) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "blood_group" VARCHAR(5),
    "address" TEXT,
    "emergency_contact" VARCHAR(20),
    "admission_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_classes" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "section_id" INTEGER NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL DEFAULT 1,
    "roll_number" INTEGER,
    "status" "StudentClassStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL DEFAULT 1,
    "occupation" VARCHAR(100),
    "workplace" VARCHAR(255),
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_parents" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL DEFAULT 1,
    "relationship" "Relationship" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" SERIAL NOT NULL,
    "student_class_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL DEFAULT 1,
    "attendance_date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "remarks" TEXT,
    "marked_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "exam_type" "ExamType" NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" INTEGER NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "working_days" INTEGER,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_subjects" (
    "id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "class_subject_id" INTEGER NOT NULL,
    "exam_date" DATE,
    "start_time" TIME,
    "end_time" TIME,
    "has_theory" BOOLEAN NOT NULL DEFAULT true,
    "has_practical" BOOLEAN NOT NULL DEFAULT false,
    "full_marks" INTEGER NOT NULL,
    "pass_marks" INTEGER NOT NULL,
    "theory_full_marks" INTEGER NOT NULL DEFAULT 100,
    "practical_full_marks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_results" (
    "id" SERIAL NOT NULL,
    "exam_subject_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "student_class_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL DEFAULT 1,
    "marks_obtained" DECIMAL(5,2),
    "practical_marks" DECIMAL(5,2) DEFAULT 0,
    "is_absent" BOOLEAN NOT NULL DEFAULT false,
    "grade" VARCHAR(5),
    "remarks" TEXT,
    "entered_by" INTEGER NOT NULL,
    "entered_by_role" VARCHAR(20) NOT NULL DEFAULT 'TEACHER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_cards" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "student_class_id" INTEGER NOT NULL,
    "total_marks" DECIMAL(7,2),
    "percentage" DECIMAL(5,2),
    "overall_grade" VARCHAR(5),
    "class_rank" INTEGER,
    "teacher_remarks" TEXT,
    "principal_remarks" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grade_scale_id" INTEGER,
    "days_present" INTEGER,
    "days_late" INTEGER,
    "total_working_days" INTEGER,

    CONSTRAINT "report_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" SERIAL NOT NULL,
    "teacher_subject_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "due_date" DATE NOT NULL,
    "total_marks" INTEGER NOT NULL DEFAULT 100,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_files" (
    "id" SERIAL NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_type" VARCHAR(50),
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" SERIAL NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "student_class_id" INTEGER NOT NULL,
    "school_id" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'submitted',
    "marks_obtained" DECIMAL(5,2),
    "feedback" TEXT,
    "graded_by" INTEGER,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "graded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_files" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_type" VARCHAR(50),
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "target_type" "NoticeTargetType" NOT NULL DEFAULT 'GLOBAL',
    "priority" "NoticePriority" NOT NULL DEFAULT 'normal',
    "status" "NoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "publish_from" TIMESTAMP(3),
    "publish_to" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_role_targets" (
    "id" SERIAL NOT NULL,
    "notice_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_role_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_class_targets" (
    "id" SERIAL NOT NULL,
    "notice_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "section_id" INTEGER,
    "academic_year_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_class_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_attachments" (
    "id" SERIAL NOT NULL,
    "notice_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "from_class_id" INTEGER NOT NULL,
    "from_academic_year_id" INTEGER NOT NULL,
    "to_class_id" INTEGER,
    "to_academic_year_id" INTEGER NOT NULL,
    "status" "PromotionStatus" NOT NULL,
    "remarks" TEXT,
    "processed_by" INTEGER NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_types" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "actor_role" VARCHAR(50),

    CONSTRAINT "fee_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structures" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "fee_type_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "actor_role" VARCHAR(50),

    CONSTRAINT "fee_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_payments" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "student_class_id" INTEGER NOT NULL,
    "fee_structure_id" INTEGER NOT NULL,
    "amount_due" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by_id" INTEGER,
    "cancel_reason" VARCHAR(500),
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" INTEGER,
    "updated_by_user_id" INTEGER,
    "actor_role" VARCHAR(50),

    CONSTRAINT "fee_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_audits" (
    "id" SERIAL NOT NULL,
    "class_subject_id" INTEGER,
    "subject_id" INTEGER,
    "action" "SubjectAuditAction" NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "performed_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "user_agent" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "revoked_at" TIMESTAMP(3),
    "replaced_by_token_id" INTEGER,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structure_installments" (
    "id" SERIAL NOT NULL,
    "fee_structure_id" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "due_date" DATE,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_structure_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_installments" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "obligation_id" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "due_date" DATE,
    "amount" DECIMAL(12,2) NOT NULL,
    "discount_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_transactions" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "student_class_id" INTEGER NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "type" "FeeTxnType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_on" DATE NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" VARCHAR(100),
    "remarks" VARCHAR(500),
    "receipt_number" VARCHAR(40) NOT NULL,
    "fiscal_year" VARCHAR(10) NOT NULL,
    "idempotency_key" VARCHAR(64),
    "reverses_id" INTEGER,
    "reversal_reason" VARCHAR(500),
    "reversal_category" "ReversalCategory",
    "recorded_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_allocations" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "installment_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "fee_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_reversal_requests" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "category" "ReversalCategory" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" INTEGER NOT NULL,
    "decided_by_id" INTEGER,
    "decided_at" TIMESTAMP(3),
    "decision_note" VARCHAR(500),
    "reversal_txn_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_reversal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_discounts" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "academic_year_id" INTEGER NOT NULL,
    "fee_type_id" INTEGER,
    "kind" "DiscountKind" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "category" "DiscountCategory" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" INTEGER NOT NULL,
    "approved_by_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "decision_note" VARCHAR(500),
    "revoked_by_id" INTEGER,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_discount_applications" (
    "id" SERIAL NOT NULL,
    "discount_id" INTEGER NOT NULL,
    "installment_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "fee_discount_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_sequences" (
    "school_id" INTEGER NOT NULL,
    "series" VARCHAR(5) NOT NULL,
    "fiscal_year" VARCHAR(10) NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "receipt_sequences_pkey" PRIMARY KEY ("school_id","series","fiscal_year")
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_code_key" ON "schools"("code");

-- CreateIndex
CREATE INDEX "schools_code_idx" ON "schools"("code");

-- CreateIndex
CREATE INDEX "schools_is_active_idx" ON "schools"("is_active");

-- CreateIndex
CREATE INDEX "grade_scales_school_id_idx" ON "grade_scales"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "grade_scales_school_id_name_key" ON "grade_scales"("school_id", "name");

-- CreateIndex
CREATE INDEX "grade_bands_grade_scale_id_idx" ON "grade_bands"("grade_scale_id");

-- CreateIndex
CREATE UNIQUE INDEX "grade_bands_grade_scale_id_grade_key" ON "grade_bands"("grade_scale_id", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_name_idx" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "permissions_name_idx" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "users_school_id_idx" ON "users"("school_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_first_name_last_name_idx" ON "users"("first_name", "last_name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_school_id_key" ON "users"("email", "school_id");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "academic_years_school_id_idx" ON "academic_years"("school_id");

-- CreateIndex
CREATE INDEX "academic_years_is_current_idx" ON "academic_years"("is_current");

-- CreateIndex
CREATE INDEX "academic_years_start_date_end_date_idx" ON "academic_years"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_school_id_name_key" ON "academic_years"("school_id", "name");

-- CreateIndex
CREATE INDEX "classes_school_id_idx" ON "classes"("school_id");

-- CreateIndex
CREATE INDEX "classes_grade_level_idx" ON "classes"("grade_level");

-- CreateIndex
CREATE UNIQUE INDEX "classes_school_id_name_key" ON "classes"("school_id", "name");

-- CreateIndex
CREATE INDEX "sections_school_id_idx" ON "sections"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "sections_school_id_name_key" ON "sections"("school_id", "name");

-- CreateIndex
CREATE INDEX "subjects_school_id_idx" ON "subjects"("school_id");

-- CreateIndex
CREATE INDEX "subjects_code_idx" ON "subjects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_school_id_code_key" ON "subjects"("school_id", "code");

-- CreateIndex
CREATE INDEX "class_subjects_class_id_idx" ON "class_subjects"("class_id");

-- CreateIndex
CREATE INDEX "class_subjects_academic_year_id_idx" ON "class_subjects"("academic_year_id");

-- CreateIndex
CREATE INDEX "class_subjects_subject_id_idx" ON "class_subjects"("subject_id");

-- CreateIndex
CREATE INDEX "class_subjects_class_id_academic_year_id_idx" ON "class_subjects"("class_id", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_subjects_class_id_academic_year_id_subject_id_key" ON "class_subjects"("class_id", "academic_year_id", "subject_id");

-- CreateIndex
CREATE INDEX "teacher_subjects_user_id_idx" ON "teacher_subjects"("user_id");

-- CreateIndex
CREATE INDEX "teacher_subjects_class_subject_id_idx" ON "teacher_subjects"("class_subject_id");

-- CreateIndex
CREATE INDEX "teacher_subjects_section_id_idx" ON "teacher_subjects"("section_id");

-- CreateIndex
CREATE INDEX "teacher_subjects_academic_year_id_idx" ON "teacher_subjects"("academic_year_id");

-- CreateIndex
CREATE INDEX "teacher_subjects_class_subject_id_academic_year_id_idx" ON "teacher_subjects"("class_subject_id", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_subjects_user_id_class_subject_id_section_id_academ_key" ON "teacher_subjects"("user_id", "class_subject_id", "section_id", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE INDEX "students_user_id_idx" ON "students"("user_id");

-- CreateIndex
CREATE INDEX "students_admission_number_idx" ON "students"("admission_number");

-- CreateIndex
CREATE INDEX "students_date_of_birth_idx" ON "students"("date_of_birth");

-- CreateIndex
CREATE INDEX "students_school_id_idx" ON "students"("school_id");

-- CreateIndex
CREATE INDEX "student_classes_student_id_idx" ON "student_classes"("student_id");

-- CreateIndex
CREATE INDEX "student_classes_class_id_idx" ON "student_classes"("class_id");

-- CreateIndex
CREATE INDEX "student_classes_section_id_idx" ON "student_classes"("section_id");

-- CreateIndex
CREATE INDEX "student_classes_academic_year_id_idx" ON "student_classes"("academic_year_id");

-- CreateIndex
CREATE INDEX "student_classes_status_idx" ON "student_classes"("status");

-- CreateIndex
CREATE INDEX "student_classes_class_id_section_id_academic_year_id_idx" ON "student_classes"("class_id", "section_id", "academic_year_id");

-- CreateIndex
CREATE INDEX "student_classes_school_id_idx" ON "student_classes"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_classes_student_id_academic_year_id_key" ON "student_classes"("student_id", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "parents_user_id_key" ON "parents"("user_id");

-- CreateIndex
CREATE INDEX "parents_user_id_idx" ON "parents"("user_id");

-- CreateIndex
CREATE INDEX "parents_school_id_idx" ON "parents"("school_id");

-- CreateIndex
CREATE INDEX "student_parents_student_id_idx" ON "student_parents"("student_id");

-- CreateIndex
CREATE INDEX "student_parents_parent_id_idx" ON "student_parents"("parent_id");

-- CreateIndex
CREATE INDEX "student_parents_school_id_idx" ON "student_parents"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_parents_student_id_parent_id_key" ON "student_parents"("student_id", "parent_id");

-- CreateIndex
CREATE INDEX "attendance_student_class_id_idx" ON "attendance"("student_class_id");

-- CreateIndex
CREATE INDEX "attendance_student_id_idx" ON "attendance"("student_id");

-- CreateIndex
CREATE INDEX "attendance_attendance_date_idx" ON "attendance"("attendance_date");

-- CreateIndex
CREATE INDEX "attendance_status_idx" ON "attendance"("status");

-- CreateIndex
CREATE INDEX "attendance_marked_by_idx" ON "attendance"("marked_by");

-- CreateIndex
CREATE INDEX "attendance_student_id_attendance_date_idx" ON "attendance"("student_id", "attendance_date");

-- CreateIndex
CREATE INDEX "attendance_school_id_idx" ON "attendance"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_student_id_student_class_id_attendance_date_key" ON "attendance"("student_id", "student_class_id", "attendance_date");

-- CreateIndex
CREATE INDEX "exams_school_id_idx" ON "exams"("school_id");

-- CreateIndex
CREATE INDEX "exams_academic_year_id_idx" ON "exams"("academic_year_id");

-- CreateIndex
CREATE INDEX "exams_exam_type_idx" ON "exams"("exam_type");

-- CreateIndex
CREATE INDEX "exams_status_idx" ON "exams"("status");

-- CreateIndex
CREATE INDEX "exams_created_by_idx" ON "exams"("created_by");

-- CreateIndex
CREATE INDEX "exams_start_date_end_date_idx" ON "exams"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "exam_subjects_exam_id_idx" ON "exam_subjects"("exam_id");

-- CreateIndex
CREATE INDEX "exam_subjects_class_subject_id_idx" ON "exam_subjects"("class_subject_id");

-- CreateIndex
CREATE INDEX "exam_subjects_exam_date_idx" ON "exam_subjects"("exam_date");

-- CreateIndex
CREATE UNIQUE INDEX "exam_subjects_exam_id_class_subject_id_key" ON "exam_subjects"("exam_id", "class_subject_id");

-- CreateIndex
CREATE INDEX "exam_results_exam_subject_id_idx" ON "exam_results"("exam_subject_id");

-- CreateIndex
CREATE INDEX "exam_results_student_id_idx" ON "exam_results"("student_id");

-- CreateIndex
CREATE INDEX "exam_results_student_class_id_idx" ON "exam_results"("student_class_id");

-- CreateIndex
CREATE INDEX "exam_results_entered_by_idx" ON "exam_results"("entered_by");

-- CreateIndex
CREATE INDEX "exam_results_grade_idx" ON "exam_results"("grade");

-- CreateIndex
CREATE INDEX "exam_results_school_id_idx" ON "exam_results"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_results_exam_subject_id_student_id_key" ON "exam_results"("exam_subject_id", "student_id");

-- CreateIndex
CREATE INDEX "report_cards_student_id_idx" ON "report_cards"("student_id");

-- CreateIndex
CREATE INDEX "report_cards_exam_id_idx" ON "report_cards"("exam_id");

-- CreateIndex
CREATE INDEX "report_cards_student_class_id_idx" ON "report_cards"("student_class_id");

-- CreateIndex
CREATE INDEX "report_cards_is_published_idx" ON "report_cards"("is_published");

-- CreateIndex
CREATE INDEX "report_cards_class_rank_idx" ON "report_cards"("class_rank");

-- CreateIndex
CREATE INDEX "report_cards_grade_scale_id_idx" ON "report_cards"("grade_scale_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_cards_student_id_exam_id_key" ON "report_cards"("student_id", "exam_id");

-- CreateIndex
CREATE INDEX "assignments_teacher_subject_id_idx" ON "assignments"("teacher_subject_id");

-- CreateIndex
CREATE INDEX "assignments_due_date_idx" ON "assignments"("due_date");

-- CreateIndex
CREATE INDEX "assignments_is_published_idx" ON "assignments"("is_published");

-- CreateIndex
CREATE INDEX "assignment_files_assignment_id_idx" ON "assignment_files"("assignment_id");

-- CreateIndex
CREATE INDEX "submissions_assignment_id_idx" ON "submissions"("assignment_id");

-- CreateIndex
CREATE INDEX "submissions_student_id_idx" ON "submissions"("student_id");

-- CreateIndex
CREATE INDEX "submissions_student_class_id_idx" ON "submissions"("student_class_id");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "submissions_graded_by_idx" ON "submissions"("graded_by");

-- CreateIndex
CREATE INDEX "submissions_school_id_idx" ON "submissions"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_assignment_id_student_id_key" ON "submissions"("assignment_id", "student_id");

-- CreateIndex
CREATE INDEX "submission_files_submission_id_idx" ON "submission_files"("submission_id");

-- CreateIndex
CREATE INDEX "notices_school_id_status_idx" ON "notices"("school_id", "status");

-- CreateIndex
CREATE INDEX "notices_school_id_target_type_idx" ON "notices"("school_id", "target_type");

-- CreateIndex
CREATE INDEX "notices_school_id_status_publish_from_publish_to_idx" ON "notices"("school_id", "status", "publish_from", "publish_to");

-- CreateIndex
CREATE INDEX "notices_created_by_id_idx" ON "notices"("created_by_id");

-- CreateIndex
CREATE INDEX "notices_priority_idx" ON "notices"("priority");

-- CreateIndex
CREATE INDEX "notice_role_targets_notice_id_idx" ON "notice_role_targets"("notice_id");

-- CreateIndex
CREATE INDEX "notice_role_targets_role_id_idx" ON "notice_role_targets"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "notice_role_targets_notice_id_role_id_key" ON "notice_role_targets"("notice_id", "role_id");

-- CreateIndex
CREATE INDEX "notice_class_targets_notice_id_idx" ON "notice_class_targets"("notice_id");

-- CreateIndex
CREATE INDEX "notice_class_targets_class_id_idx" ON "notice_class_targets"("class_id");

-- CreateIndex
CREATE INDEX "notice_class_targets_section_id_idx" ON "notice_class_targets"("section_id");

-- CreateIndex
CREATE INDEX "notice_class_targets_academic_year_id_idx" ON "notice_class_targets"("academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "notice_class_targets_notice_id_class_id_section_id_academic_key" ON "notice_class_targets"("notice_id", "class_id", "section_id", "academic_year_id");

-- CreateIndex
CREATE INDEX "notice_attachments_notice_id_idx" ON "notice_attachments"("notice_id");

-- CreateIndex
CREATE INDEX "promotions_student_id_idx" ON "promotions"("student_id");

-- CreateIndex
CREATE INDEX "promotions_from_academic_year_id_idx" ON "promotions"("from_academic_year_id");

-- CreateIndex
CREATE INDEX "promotions_to_academic_year_id_idx" ON "promotions"("to_academic_year_id");

-- CreateIndex
CREATE INDEX "promotions_status_idx" ON "promotions"("status");

-- CreateIndex
CREATE INDEX "promotions_processed_by_idx" ON "promotions"("processed_by");

-- CreateIndex
CREATE INDEX "fee_types_school_id_idx" ON "fee_types"("school_id");

-- CreateIndex
CREATE INDEX "fee_types_is_active_idx" ON "fee_types"("is_active");

-- CreateIndex
CREATE INDEX "fee_types_created_by_user_id_idx" ON "fee_types"("created_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_types_school_id_name_key" ON "fee_types"("school_id", "name");

-- CreateIndex
CREATE INDEX "fee_structures_school_id_idx" ON "fee_structures"("school_id");

-- CreateIndex
CREATE INDEX "fee_structures_fee_type_id_idx" ON "fee_structures"("fee_type_id");

-- CreateIndex
CREATE INDEX "fee_structures_class_id_idx" ON "fee_structures"("class_id");

-- CreateIndex
CREATE INDEX "fee_structures_academic_year_id_idx" ON "fee_structures"("academic_year_id");

-- CreateIndex
CREATE INDEX "fee_structures_class_id_academic_year_id_idx" ON "fee_structures"("class_id", "academic_year_id");

-- CreateIndex
CREATE INDEX "fee_structures_created_by_user_id_idx" ON "fee_structures"("created_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structures_fee_type_id_class_id_academic_year_id_key" ON "fee_structures"("fee_type_id", "class_id", "academic_year_id");

-- CreateIndex
CREATE INDEX "fee_payments_school_id_idx" ON "fee_payments"("school_id");

-- CreateIndex
CREATE INDEX "fee_payments_student_class_id_idx" ON "fee_payments"("student_class_id");

-- CreateIndex
CREATE INDEX "fee_payments_fee_structure_id_idx" ON "fee_payments"("fee_structure_id");

-- CreateIndex
CREATE INDEX "fee_payments_status_idx" ON "fee_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fee_payments_student_class_id_fee_structure_id_key" ON "fee_payments"("student_class_id", "fee_structure_id");

-- CreateIndex
CREATE INDEX "subject_audits_class_subject_id_idx" ON "subject_audits"("class_subject_id");

-- CreateIndex
CREATE INDEX "subject_audits_subject_id_idx" ON "subject_audits"("subject_id");

-- CreateIndex
CREATE INDEX "subject_audits_performed_by_user_id_idx" ON "subject_audits"("performed_by_user_id");

-- CreateIndex
CREATE INDEX "subject_audits_action_idx" ON "subject_audits"("action");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_revoked_at_idx" ON "refresh_tokens"("revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structure_installments_fee_structure_id_sequence_key" ON "fee_structure_installments"("fee_structure_id", "sequence");

-- CreateIndex
CREATE INDEX "fee_installments_school_id_due_date_idx" ON "fee_installments"("school_id", "due_date");

-- CreateIndex
CREATE INDEX "fee_installments_status_idx" ON "fee_installments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fee_installments_obligation_id_sequence_key" ON "fee_installments"("obligation_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "fee_transactions_reverses_id_key" ON "fee_transactions"("reverses_id");

-- CreateIndex
CREATE INDEX "fee_transactions_school_id_paid_on_idx" ON "fee_transactions"("school_id", "paid_on");

-- CreateIndex
CREATE INDEX "fee_transactions_school_id_student_id_idx" ON "fee_transactions"("school_id", "student_id");

-- CreateIndex
CREATE INDEX "fee_transactions_type_idx" ON "fee_transactions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "fee_transactions_school_id_receipt_number_key" ON "fee_transactions"("school_id", "receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "fee_transactions_school_id_idempotency_key_key" ON "fee_transactions"("school_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "fee_allocations_transaction_id_idx" ON "fee_allocations"("transaction_id");

-- CreateIndex
CREATE INDEX "fee_allocations_installment_id_idx" ON "fee_allocations"("installment_id");

-- CreateIndex
CREATE INDEX "fee_reversal_requests_school_id_status_idx" ON "fee_reversal_requests"("school_id", "status");

-- CreateIndex
CREATE INDEX "fee_reversal_requests_transaction_id_idx" ON "fee_reversal_requests"("transaction_id");

-- CreateIndex
CREATE INDEX "fee_discounts_school_id_status_idx" ON "fee_discounts"("school_id", "status");

-- CreateIndex
CREATE INDEX "fee_discounts_student_id_academic_year_id_idx" ON "fee_discounts"("student_id", "academic_year_id");

-- CreateIndex
CREATE INDEX "fee_discount_applications_installment_id_idx" ON "fee_discount_applications"("installment_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_discount_applications_discount_id_installment_id_key" ON "fee_discount_applications"("discount_id", "installment_id");

-- AddForeignKey
ALTER TABLE "grade_scales" ADD CONSTRAINT "grade_scales_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_bands" ADD CONSTRAINT "grade_bands_grade_scale_id_fkey" FOREIGN KEY ("grade_scale_id") REFERENCES "grade_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_class_id_fkey" FOREIGN KEY ("student_class_id") REFERENCES "student_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_exam_subject_id_fkey" FOREIGN KEY ("exam_subject_id") REFERENCES "exam_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_student_class_id_fkey" FOREIGN KEY ("student_class_id") REFERENCES "student_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_class_id_fkey" FOREIGN KEY ("student_class_id") REFERENCES "student_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_grade_scale_id_fkey" FOREIGN KEY ("grade_scale_id") REFERENCES "grade_scales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_teacher_subject_id_fkey" FOREIGN KEY ("teacher_subject_id") REFERENCES "teacher_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_files" ADD CONSTRAINT "assignment_files_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_class_id_fkey" FOREIGN KEY ("student_class_id") REFERENCES "student_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_files" ADD CONSTRAINT "submission_files_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_role_targets" ADD CONSTRAINT "notice_role_targets_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_role_targets" ADD CONSTRAINT "notice_role_targets_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_class_targets" ADD CONSTRAINT "notice_class_targets_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_class_targets" ADD CONSTRAINT "notice_class_targets_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_class_targets" ADD CONSTRAINT "notice_class_targets_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_class_targets" ADD CONSTRAINT "notice_class_targets_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_attachments" ADD CONSTRAINT "notice_attachments_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_from_class_id_fkey" FOREIGN KEY ("from_class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_from_academic_year_id_fkey" FOREIGN KEY ("from_academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_to_class_id_fkey" FOREIGN KEY ("to_class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_to_academic_year_id_fkey" FOREIGN KEY ("to_academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_types" ADD CONSTRAINT "fee_types_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_types" ADD CONSTRAINT "fee_types_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_types" ADD CONSTRAINT "fee_types_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_fee_type_id_fkey" FOREIGN KEY ("fee_type_id") REFERENCES "fee_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_student_class_id_fkey" FOREIGN KEY ("student_class_id") REFERENCES "student_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "fee_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structure_installments" ADD CONSTRAINT "fee_structure_installments_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "fee_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_installments" ADD CONSTRAINT "fee_installments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_installments" ADD CONSTRAINT "fee_installments_obligation_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "fee_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_transactions" ADD CONSTRAINT "fee_transactions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_transactions" ADD CONSTRAINT "fee_transactions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_transactions" ADD CONSTRAINT "fee_transactions_student_class_id_fkey" FOREIGN KEY ("student_class_id") REFERENCES "student_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_transactions" ADD CONSTRAINT "fee_transactions_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_transactions" ADD CONSTRAINT "fee_transactions_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_transactions" ADD CONSTRAINT "fee_transactions_reverses_id_fkey" FOREIGN KEY ("reverses_id") REFERENCES "fee_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_allocations" ADD CONSTRAINT "fee_allocations_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "fee_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_allocations" ADD CONSTRAINT "fee_allocations_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "fee_installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reversal_requests" ADD CONSTRAINT "fee_reversal_requests_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reversal_requests" ADD CONSTRAINT "fee_reversal_requests_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "fee_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reversal_requests" ADD CONSTRAINT "fee_reversal_requests_reversal_txn_id_fkey" FOREIGN KEY ("reversal_txn_id") REFERENCES "fee_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reversal_requests" ADD CONSTRAINT "fee_reversal_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reversal_requests" ADD CONSTRAINT "fee_reversal_requests_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_discounts" ADD CONSTRAINT "fee_discounts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_discounts" ADD CONSTRAINT "fee_discounts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_discounts" ADD CONSTRAINT "fee_discounts_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_discounts" ADD CONSTRAINT "fee_discounts_fee_type_id_fkey" FOREIGN KEY ("fee_type_id") REFERENCES "fee_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_discounts" ADD CONSTRAINT "fee_discounts_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_discounts" ADD CONSTRAINT "fee_discounts_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_discounts" ADD CONSTRAINT "fee_discounts_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_discount_applications" ADD CONSTRAINT "fee_discount_applications_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "fee_discounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_discount_applications" ADD CONSTRAINT "fee_discount_applications_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "fee_installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_sequences" ADD CONSTRAINT "receipt_sequences_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

