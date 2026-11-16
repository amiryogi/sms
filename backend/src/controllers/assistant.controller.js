const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler, parsePagination } = require("../utils");
const { openSse } = require("../utils/sse");
const { parseDateOnly } = require("../utils/calendar/dateValidation");
const { normalizeAssistantConfig, validateAssistantConfig } = require("../utils/assistantConfig");
const assistant = require("../services/assistant");
const providerManager = require("../services/assistant/providerManager");
const { describeProviders } = require("../services/assistant/providers");
const { usageSummary, recordUsage, nepalDayStart, NEPAL_OFFSET_MS } = require("../services/assistant/usage");
const { purgeExpiredConversations } = require("../services/assistant/retention");
const { USER_MESSAGES } = require("../services/assistant/providers/errors");

/**
 * @desc    What the help widget needs: whether it is on for me, suggestions, walkthroughs
 * @route   GET /api/v1/assistant/bootstrap
 * @access  Private (any role)
 */
const getBootstrap = asyncHandler(async (req, res) => ApiResponse.success(res, assistant.bootstrap(req.user)));

/** Abort the provider call when the client goes away. */
const abortOnClose = (req, res) => {
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) controller.abort();
  });
  return controller.signal;
};

/**
 * @desc    Ask a question; the answer streams as Server-Sent Events
 *          (meta, delta…, then done or error)
 * @route   POST /api/v1/assistant/chat/stream
 * @access  Private (roles the school enabled)
 */
const chatStream = asyncHandler(async (req, res) => {
  // Every refusal (403/404/429/400) happens here, as a normal JSON error.
  const chat = await assistant.startChat(req.user, req.body);
  const signal = abortOnClose(req, res);
  const sse = openSse(res);
  try {
    for await (const { event, data } of assistant.runChat(chat, signal)) sse.send(event, data);
  } catch (error) {
    console.error(`[assistant] stream failed: ${error.message}`);
    sse.send("error", { code: "unknown", message: USER_MESSAGES.unknown });
  } finally {
    sse.close();
  }
});

/**
 * @desc    Ask a question and get the whole answer in one response (fallback when the
 *          network in between buffers the stream)
 * @route   POST /api/v1/assistant/chat
 * @access  Private (roles the school enabled)
 */
const chat = asyncHandler(async (req, res) => {
  const prepared = await assistant.startChat(req.user, req.body);
  const signal = abortOnClose(req, res);
  let meta = null;
  let text = "";
  let done = null;
  let failure = null;
  for await (const { event, data } of assistant.runChat(prepared, signal)) {
    if (event === "meta") meta = data;
    else if (event === "delta") text += data.text;
    else if (event === "done") done = data;
    else if (event === "error") failure = data;
  }
  if (failure) {
    return ApiResponse.success(res, { ...meta, answer: text, error: failure }, "The assistant could not answer");
  }
  return ApiResponse.success(res, { ...meta, answer: text, ...done });
});

/* ------------------------------------------------------------ conversations */

/**
 * @desc    My conversations, newest first
 * @route   GET /api/v1/assistant/conversations
 * @access  Private (own only)
 */
const listConversations = asyncHandler(async (req, res) => {
  const settings = assistant.settingsFor(req.user);
  await purgeExpiredConversations(req.user.schoolId, settings.retentionDays);
  const { page, limit, skip } = parsePagination(req.query);
  const where = { schoolId: req.user.schoolId, userId: req.user.id };
  const [data, total] = await Promise.all([
    prisma.aiConversation.findMany({
      where,
      select: { id: true, title: true, language: true, createdAt: true, lastMessageAt: true, _count: { select: { messages: true } } },
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      skip,
      take: limit,
    }),
    prisma.aiConversation.count({ where }),
  ]);
  return ApiResponse.paginated(
    res,
    data.map(({ _count, ...c }) => ({ ...c, messageCount: _count.messages })),
    { page, limit, total }
  );
});

/**
 * @desc    One of my conversations with its messages
 * @route   GET /api/v1/assistant/conversations/:id
 * @access  Private (own only; anyone else's is "not found")
 */
const getConversation = asyncHandler(async (req, res) => {
  const conversation = await prisma.aiConversation.findFirst({
    where: { id: req.params.id, schoolId: req.user.schoolId, userId: req.user.id },
    select: {
      id: true,
      title: true,
      language: true,
      createdAt: true,
      lastMessageAt: true,
      messages: {
        select: { id: true, role: true, content: true, language: true, sources: true, guideIds: true, createdAt: true, usageEvent: { select: { feedback: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!conversation) throw ApiError.notFound("Conversation not found");
  const guides = new Map(assistant.guidesFor(req.user.roles).map((g) => [g.id, g]));
  return ApiResponse.success(res, {
    ...conversation,
    messages: conversation.messages.map(({ usageEvent, guideIds, ...m }) => ({
      ...m,
      feedback: usageEvent?.feedback ?? 0,
      // Only walkthroughs this user may still run.
      guides: (Array.isArray(guideIds) ? guideIds : []).filter((id) => guides.has(id)).map((id) => guides.get(id)),
    })),
  });
});

/**
 * @desc    Delete one of my conversations
 * @route   DELETE /api/v1/assistant/conversations/:id
 * @access  Private (own only)
 */
const deleteConversation = asyncHandler(async (req, res) => {
  const { count } = await prisma.aiConversation.deleteMany({ where: { id: req.params.id, schoolId: req.user.schoolId, userId: req.user.id } });
  if (!count) throw ApiError.notFound("Conversation not found");
  return ApiResponse.success(res, null, "Conversation deleted");
});

/**
 * @desc    Delete all my conversations
 * @route   DELETE /api/v1/assistant/conversations
 * @access  Private (own only)
 */
const deleteAllConversations = asyncHandler(async (req, res) => {
  const { count } = await prisma.aiConversation.deleteMany({ where: { schoolId: req.user.schoolId, userId: req.user.id } });
  return ApiResponse.success(res, { deleted: count }, "History cleared");
});

/**
 * @desc    Rate one of my answers (+1 / -1 / 0), optionally with a comment for the admins
 * @route   POST /api/v1/assistant/messages/:id/feedback
 * @access  Private (own messages only)
 */
const giveFeedback = asyncHandler(async (req, res) => {
  const message = await prisma.aiMessage.findFirst({
    where: { id: req.params.id, schoolId: req.user.schoolId, role: "assistant", conversation: { userId: req.user.id, schoolId: req.user.schoolId } },
    select: { id: true, usageEventId: true },
  });
  if (!message?.usageEventId) throw ApiError.notFound("Message not found");
  const comment = typeof req.body.comment === "string" && req.body.comment.trim() ? req.body.comment.trim().slice(0, 500) : null;
  await prisma.aiUsageEvent.updateMany({
    where: { id: message.usageEventId, schoolId: req.user.schoolId },
    data: { feedback: req.body.value, feedbackComment: req.body.value === 0 ? null : comment },
  });
  return ApiResponse.success(res, { messageId: message.id, feedback: req.body.value }, "Thank you for the feedback");
});

/* -------------------------------------------------------------------- admin */

/**
 * @desc    The school's assistant settings and the providers installed on the server
 * @route   GET /api/v1/assistant/admin/settings
 * @access  ADMIN, SUPER_ADMIN
 */
const getSettings = asyncHandler(async (req, res) => {
  const school = await prisma.school.findUnique({ where: { id: req.user.schoolId }, select: { assistantConfig: true } });
  return ApiResponse.success(res, {
    settings: normalizeAssistantConfig(school?.assistantConfig),
    providers: describeProviders(),
    serverEnabled: require("../config").assistant.enabled,
    fakeProvider: providerManager.fakeMode(),
  });
});

/**
 * @desc    Change the school's assistant settings (only fields sent are changed)
 * @route   PUT /api/v1/assistant/admin/settings
 * @access  ADMIN, SUPER_ADMIN
 */
const updateSettings = asyncHandler(async (req, res) => {
  const school = await prisma.school.findUnique({ where: { id: req.user.schoolId }, select: { assistantConfig: true } });
  const current = normalizeAssistantConfig(school?.assistantConfig);
  const { value, errors } = validateAssistantConfig(req.body, current);
  if (!providerManager.isUsable(value.provider)) {
    errors.push({ field: "provider", message: `No API key is installed on the server for ${value.provider}` });
  }
  if (value.fallback.enabled && !providerManager.isUsable(value.fallback.provider)) {
    errors.push({ field: "fallback.provider", message: `No API key is installed on the server for ${value.fallback.provider}` });
  }
  if (errors.length) throw ApiError.badRequest("Settings not saved", errors);
  await prisma.school.update({ where: { id: req.user.schoolId }, data: { assistantConfig: value } });
  return ApiResponse.success(res, { settings: value, providers: describeProviders() }, "Assistant settings saved");
});

/**
 * @desc    Check a provider's key and a model with one tiny request
 * @route   POST /api/v1/assistant/admin/test-provider
 * @access  ADMIN, SUPER_ADMIN
 */
const testProvider = asyncHandler(async (req, res) => {
  const { provider, model } = req.body;
  if (!providerManager.isUsable(provider)) {
    return ApiResponse.success(res, { ok: false, error: { code: "not_configured", message: USER_MESSAGES.not_configured } });
  }
  const result = await providerManager.testConnection({ provider, model });
  await recordUsage({
    schoolId: req.user.schoolId,
    userId: req.user.id,
    role: req.user.roles.includes("SUPER_ADMIN") ? "SUPER_ADMIN" : "ADMIN",
    provider,
    model,
    inputTokens: result.usage?.inputTokens,
    outputTokens: result.usage?.outputTokens,
    latencyMs: result.latencyMs,
    status: result.ok ? "ok" : "error",
    errorCode: result.ok ? null : result.error.code,
    module: "test",
  });
  const { usage, ...out } = result;
  return ApiResponse.success(res, out, result.ok ? "Connection works" : "Connection failed");
});

/**
 * @desc    Usage, errors, cost and feedback between two dates (Nepal time; default 30 days)
 * @route   GET /api/v1/assistant/admin/usage
 * @access  ADMIN, SUPER_ADMIN
 */
const getUsage = asyncHandler(async (req, res) => {
  const DAY = 24 * 60 * 60 * 1000;
  // Today's Nepal date as UTC midnight, the same form parseDateOnly returns.
  const today = new Date(nepalDayStart().getTime() + NEPAL_OFFSET_MS);
  const toDay = req.query.to ? parseDateOnly(req.query.to) : today;
  const fromDay = req.query.from ? parseDateOnly(req.query.from) : new Date(toDay.getTime() - 29 * DAY);
  if (fromDay > toDay) throw ApiError.badRequest("from must be on or before to");
  if (toDay.getTime() - fromDay.getTime() > 366 * DAY) throw ApiError.badRequest("Choose at most 366 days");
  // Nepal calendar days as instants: [from 00:00 NPT, to+1 00:00 NPT)
  const from = new Date(fromDay.getTime() - NEPAL_OFFSET_MS);
  const to = new Date(toDay.getTime() + DAY - NEPAL_OFFSET_MS);
  const summary = await usageSummary(req.user.schoolId, { from, to });
  return ApiResponse.success(res, { from: fromDay.toISOString().slice(0, 10), to: toDay.toISOString().slice(0, 10), ...summary });
});

module.exports = {
  getBootstrap,
  chatStream,
  chat,
  listConversations,
  getConversation,
  deleteConversation,
  deleteAllConversations,
  giveFeedback,
  getSettings,
  updateSettings,
  testProvider,
  getUsage,
};
