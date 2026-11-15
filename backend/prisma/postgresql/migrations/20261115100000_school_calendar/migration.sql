-- School calendar: events and holidays, who they are for, holiday imports, and
-- the school's calendar settings (schools.calendar_config, NULL = defaults).
-- New tables and one nullable column only: existing rows are unchanged.

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "calendar_config" JSONB;

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "academic_year_id" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(40) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_all_day" BOOLEAN NOT NULL DEFAULT true,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "recurrence" VARCHAR(20) NOT NULL DEFAULT 'NONE',
    "recurrence_until" DATE,
    "audience_type" VARCHAR(10) NOT NULL DEFAULT 'ALL',
    "status" VARCHAR(10) NOT NULL DEFAULT 'PUBLISHED',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "source" VARCHAR(255),
    "source_document" VARCHAR(500),
    "source_published_date" VARCHAR(20),
    "applicability" VARCHAR(500),
    "source_key" VARCHAR(100),
    "import_id" INTEGER,
    "created_by_id" INTEGER NOT NULL,
    "updated_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event_audiences" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "role_id" INTEGER,
    "class_id" INTEGER,
    "section_id" INTEGER,

    CONSTRAINT "calendar_event_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_imports" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "calendar_year" INTEGER NOT NULL,
    "source" VARCHAR(255) NOT NULL,
    "source_document" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "imported_by_id" INTEGER NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_events_school_id_start_date_end_date_idx" ON "calendar_events"("school_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "calendar_events_school_id_category_idx" ON "calendar_events"("school_id", "category");

-- CreateIndex
CREATE INDEX "calendar_events_school_id_source_key_idx" ON "calendar_events"("school_id", "source_key");

-- CreateIndex
CREATE INDEX "calendar_events_academic_year_id_idx" ON "calendar_events"("academic_year_id");

-- CreateIndex
CREATE INDEX "calendar_events_created_by_id_idx" ON "calendar_events"("created_by_id");

-- CreateIndex
CREATE INDEX "calendar_events_updated_by_id_idx" ON "calendar_events"("updated_by_id");

-- CreateIndex
CREATE INDEX "calendar_events_import_id_idx" ON "calendar_events"("import_id");

-- CreateIndex
CREATE INDEX "calendar_event_audiences_event_id_idx" ON "calendar_event_audiences"("event_id");

-- CreateIndex
CREATE INDEX "calendar_event_audiences_role_id_idx" ON "calendar_event_audiences"("role_id");

-- CreateIndex
CREATE INDEX "calendar_event_audiences_class_id_idx" ON "calendar_event_audiences"("class_id");

-- CreateIndex
CREATE INDEX "calendar_event_audiences_section_id_idx" ON "calendar_event_audiences"("section_id");

-- CreateIndex
CREATE INDEX "calendar_imports_school_id_calendar_year_idx" ON "calendar_imports"("school_id", "calendar_year");

-- CreateIndex
CREATE INDEX "calendar_imports_imported_by_id_idx" ON "calendar_imports"("imported_by_id");

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "calendar_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_audiences" ADD CONSTRAINT "calendar_event_audiences_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_audiences" ADD CONSTRAINT "calendar_event_audiences_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_audiences" ADD CONSTRAINT "calendar_event_audiences_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_audiences" ADD CONSTRAINT "calendar_event_audiences_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_imports" ADD CONSTRAINT "calendar_imports_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_imports" ADD CONSTRAINT "calendar_imports_imported_by_id_fkey" FOREIGN KEY ("imported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

