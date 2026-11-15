-- AI help assistant: per-school settings (schools.assistant_config) and three new tables:
-- conversations, messages and usage events. New column is nullable and the tables are new,
-- so existing rows are unchanged.

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "assistant_config" JSONB;

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "language" VARCHAR(5) NOT NULL DEFAULT 'auto',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "role" VARCHAR(10) NOT NULL,
    "content" TEXT NOT NULL,
    "route" VARCHAR(200),
    "module" VARCHAR(50),
    "language" VARCHAR(5),
    "sources" JSONB,
    "guide_ids" JSONB,
    "usage_event_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_events" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "role" VARCHAR(20) NOT NULL,
    "provider" VARCHAR(20),
    "model" VARCHAR(100),
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL,
    "error_code" VARCHAR(30),
    "fell_back" BOOLEAN NOT NULL DEFAULT false,
    "language" VARCHAR(5),
    "module" VARCHAR(50),
    "feedback" INTEGER NOT NULL DEFAULT 0,
    "feedback_comment" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_conversations_school_id_user_id_last_message_at_idx" ON "ai_conversations"("school_id", "user_id", "last_message_at");

-- CreateIndex
CREATE INDEX "ai_conversations_school_id_last_message_at_idx" ON "ai_conversations"("school_id", "last_message_at");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_id_idx" ON "ai_messages"("conversation_id", "id");

-- CreateIndex
CREATE INDEX "ai_messages_school_id_idx" ON "ai_messages"("school_id");

-- CreateIndex
CREATE INDEX "ai_messages_usage_event_id_idx" ON "ai_messages"("usage_event_id");

-- CreateIndex
CREATE INDEX "ai_usage_events_school_id_created_at_idx" ON "ai_usage_events"("school_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_usage_events_school_id_user_id_created_at_idx" ON "ai_usage_events"("school_id", "user_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_usage_event_id_fkey" FOREIGN KEY ("usage_event_id") REFERENCES "ai_usage_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

