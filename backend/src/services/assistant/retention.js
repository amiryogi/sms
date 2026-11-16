/**
 * Deletes a school's conversations older than its retention period
 * (settings.retentionDays, counted from the last message).
 *
 * The deployment has no scheduler, so this runs lazily: at most once an hour per school,
 * when someone lists conversations or asks a question. Messages go with their conversation
 * (foreign key ON DELETE CASCADE). Usage events hold no text and are kept for monitoring.
 */
const prisma = require("../../config/database");

const INTERVAL_MS = 60 * 60 * 1000;
const lastRun = new Map(); // schoolId -> timestamp

async function purgeExpiredConversations(schoolId, retentionDays, { now = Date.now(), force = false } = {}) {
  if (!force && now - (lastRun.get(schoolId) || 0) < INTERVAL_MS) return 0;
  lastRun.set(schoolId, now);
  const cutoff = new Date(now - retentionDays * 24 * 60 * 60 * 1000);
  try {
    const { count } = await prisma.aiConversation.deleteMany({ where: { schoolId, lastMessageAt: { lt: cutoff } } });
    return count;
  } catch (error) {
    console.error(`[assistant] retention purge failed: ${error.message}`);
    return 0;
  }
}

/** Tests: forget when each school was last purged. */
const resetRetentionClock = () => lastRun.clear();

module.exports = { purgeExpiredConversations, resetRetentionClock };
