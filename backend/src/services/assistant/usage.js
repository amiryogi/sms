/**
 * Usage events of the assistant: one row per request to an AI provider, without the text.
 * Used for the daily per-user limit, the school's monthly token budget, and the admin's
 * monitoring page. Every query is scoped by schoolId.
 */
const prisma = require("../../config/database");
const { ApiError } = require("../../utils");
const { estimateCost } = require("./providers/models");
const { PROVIDERS } = require("./providers");

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

/** Midnight in Nepal (as a UTC instant) for the day containing `now`. */
function nepalDayStart(now = new Date()) {
  const local = new Date(now.getTime() + NEPAL_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - NEPAL_OFFSET_MS);
}

/** The first instant of the current month in Nepal time. */
function nepalMonthStart(now = new Date()) {
  const local = new Date(now.getTime() + NEPAL_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - NEPAL_OFFSET_MS);
}

/**
 * Refuse with 429 when this user reached the school's daily limit, or the school its monthly
 * token budget. Stopped requests and failures count towards the daily limit too.
 */
async function assertWithinLimits({ schoolId, userId, settings, now = new Date() }) {
  const today = await prisma.aiUsageEvent.count({
    // "module IS NULL OR module <> 'test'": a bare NOT would also drop rows with no module (SQL NULL).
    where: { schoolId, userId, createdAt: { gte: nepalDayStart(now) }, OR: [{ module: null }, { module: { not: "test" } }] },
  });
  if (today >= settings.userDailyLimit) {
    throw new ApiError(429, `You have reached today's limit of ${settings.userDailyLimit} questions. Please try again tomorrow.`, [], "ASSISTANT_DAILY_LIMIT");
  }
  if (settings.monthlyTokenBudget > 0) {
    const month = await prisma.aiUsageEvent.aggregate({
      where: { schoolId, createdAt: { gte: nepalMonthStart(now) } },
      _sum: { inputTokens: true, outputTokens: true },
    });
    const used = (month._sum.inputTokens || 0) + (month._sum.outputTokens || 0);
    if (used >= settings.monthlyTokenBudget) {
      throw new ApiError(429, "The assistant has used this month's allowance for the school. Please tell the school administrator.", [], "ASSISTANT_MONTHLY_BUDGET");
    }
  }
}

/** Record one request. Never throws: monitoring must not break the answer. */
async function recordUsage(event) {
  try {
    return await prisma.aiUsageEvent.create({
      data: {
        schoolId: event.schoolId,
        userId: event.userId ?? null,
        role: String(event.role || "").slice(0, 20),
        provider: event.provider ?? null,
        model: event.model ? String(event.model).slice(0, 100) : null,
        inputTokens: Math.max(0, Math.round(event.inputTokens || 0)),
        outputTokens: Math.max(0, Math.round(event.outputTokens || 0)),
        latencyMs: Math.max(0, Math.round(event.latencyMs || 0)),
        status: event.status,
        errorCode: event.errorCode ?? null,
        fellBack: !!event.fellBack,
        language: event.language ?? null,
        module: event.module ? String(event.module).slice(0, 50) : null,
      },
      select: { id: true },
    });
  } catch (error) {
    console.error(`[assistant] could not record usage: ${error.message}`);
    return null;
  }
}

const dayKey = (date) => new Date(date.getTime() + NEPAL_OFFSET_MS).toISOString().slice(0, 10);
const round = (n) => Math.round(n * 10000) / 10000;

/**
 * Figures for the monitoring page between two Nepal dates (inclusive).
 * @param {number} schoolId
 * @param {{ from: Date, to: Date }} range  instants: from = start of the first day, to = end
 */
async function usageSummary(schoolId, { from, to }) {
  const events = await prisma.aiUsageEvent.findMany({
    where: { schoolId, createdAt: { gte: from, lt: to } },
    select: {
      createdAt: true, role: true, provider: true, model: true, inputTokens: true, outputTokens: true,
      latencyMs: true, status: true, errorCode: true, fellBack: true, language: true, module: true, feedback: true,
    },
    orderBy: { id: "asc" },
    take: 100000,
  });

  const totals = { requests: 0, ok: 0, errors: 0, aborted: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, costKnown: true, fallbacks: 0, thumbsUp: 0, thumbsDown: 0, avgLatencyMs: 0 };
  const byDay = new Map();
  const byRole = new Map();
  const byProvider = new Map();
  const byLanguage = new Map();
  const errorsByCode = new Map();
  let latencySum = 0;

  for (const e of events) {
    if (e.module === "test") continue; // admin "Test connection" pings
    totals.requests += 1;
    if (e.status === "ok") totals.ok += 1;
    else if (e.status === "aborted") totals.aborted += 1;
    else totals.errors += 1;
    totals.inputTokens += e.inputTokens;
    totals.outputTokens += e.outputTokens;
    if (e.fellBack) totals.fallbacks += 1;
    if (e.feedback > 0) totals.thumbsUp += 1;
    if (e.feedback < 0) totals.thumbsDown += 1;
    if (e.status === "ok") latencySum += e.latencyMs;
    const cost = e.provider ? estimateCost(e.provider, e.model, e.inputTokens, e.outputTokens) : 0;
    if (cost === null) totals.costKnown = false;
    else totals.estimatedCostUsd += cost;

    const day = dayKey(e.createdAt);
    const d = byDay.get(day) || { date: day, requests: 0, answered: 0, errors: 0, tokens: 0 };
    d.requests += 1;
    if (e.status === "ok") d.answered += 1;
    if (e.status === "error") d.errors += 1;
    d.tokens += e.inputTokens + e.outputTokens;
    byDay.set(day, d);

    byRole.set(e.role, (byRole.get(e.role) || 0) + 1);
    if (e.language) byLanguage.set(e.language, (byLanguage.get(e.language) || 0) + 1);
    if (e.errorCode) errorsByCode.set(e.errorCode, (errorsByCode.get(e.errorCode) || 0) + 1);

    if (e.provider) {
      const p = byProvider.get(e.provider) || { provider: e.provider, label: PROVIDERS[e.provider]?.label || e.provider, requests: 0, errors: 0, inputTokens: 0, outputTokens: 0, lastOkAt: null, lastErrorAt: null, lastErrorCode: null };
      p.requests += 1;
      p.inputTokens += e.inputTokens;
      p.outputTokens += e.outputTokens;
      if (e.status === "ok") p.lastOkAt = e.createdAt;
      if (e.status === "error") {
        p.errors += 1;
        p.lastErrorAt = e.createdAt;
        p.lastErrorCode = e.errorCode;
      }
      byProvider.set(e.provider, p);
    }
  }
  totals.avgLatencyMs = totals.ok ? Math.round(latencySum / totals.ok) : 0;
  totals.estimatedCostUsd = round(totals.estimatedCostUsd);

  // Comments users chose to send to the administrators (no names).
  const comments = await prisma.aiUsageEvent.findMany({
    where: { schoolId, createdAt: { gte: from, lt: to }, feedbackComment: { not: null } },
    select: { id: true, createdAt: true, role: true, module: true, language: true, feedback: true, feedbackComment: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });

  return {
    totals,
    byDay: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    byRole: [...byRole.entries()].map(([role, requests]) => ({ role, requests })).sort((a, b) => b.requests - a.requests || a.role.localeCompare(b.role)),
    byLanguage: [...byLanguage.entries()].map(([language, requests]) => ({ language, requests })).sort((a, b) => a.language.localeCompare(b.language)),
    byProvider: [...byProvider.values()].sort((a, b) => a.provider.localeCompare(b.provider)),
    errorsByCode: [...errorsByCode.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code)),
    comments,
  };
}

module.exports = { assertWithinLimits, recordUsage, usageSummary, nepalDayStart, nepalMonthStart, NEPAL_OFFSET_MS };
