/**
 * The AI help assistant: one service for every role, configured per role by the help
 * documents, suggestions and walkthroughs that role may see.
 *
 * Read-only by design: it explains how to use the app and offers walkthroughs. It never
 * reads school records and has no way to change anything.
 *
 * A chat request runs in two parts so that every refusal happens before any streaming:
 *   startChat(user, body)  - checks access, limits and the conversation, finds the help
 *                            documents, builds the prompt, saves the question; throws ApiError
 *   runChat(chat, signal)  - async iterator of events for the client: meta, delta, done | error;
 *                            saves the answer and the usage event
 */
const prisma = require("../../config/database");
const config = require("../../config");
const { ApiError } = require("../../utils");
const { normalizeAssistantConfig, allowedAssistantRoles } = require("../../utils/assistantConfig");
const knowledge = require("./knowledge");
const { resolveContext } = require("./routeCatalog");
const { resolveLanguage } = require("./languageResolver");
const { buildPrompt, MAX_QUESTION } = require("./promptBuilder");
const providerManager = require("./providerManager");
const { assertWithinLimits, recordUsage } = require("./usage");
const { purgeExpiredConversations } = require("./retention");
const { CODES, USER_MESSAGES } = require("./providers/errors");
const GUIDES = require("../../data/assistant/guides.json");
const SUGGESTIONS = require("../../data/assistant/suggestions.json");

const HISTORY_LOAD = 12;

/** Settings for the user's school (the row `authenticate` already loaded). */
const settingsFor = (user) => normalizeAssistantConfig(user.school?.assistantConfig);

/** Walkthroughs one of these roles may run, with the page each starts on for that role. */
function guidesFor(roles) {
  const set = new Set(roles);
  if (set.has("SUPER_ADMIN")) set.add("ADMIN");
  return GUIDES.filter((g) => g.roles.some((r) => set.has(r))).map((g) => {
    const role = g.roles.find((r) => set.has(r));
    return { id: g.id, module: g.module, title: g.title, route: g.routeByRole?.[role] || g.route };
  });
}

/** Suggested questions for the user's roles, without duplicates, at most `limit`. */
function suggestionsFor(roles, limit = 6) {
  const seen = new Set();
  const out = [];
  const order = ["SUPER_ADMIN", "ADMIN", "TEACHER", "EXAM_OFFICER", "ACCOUNTANT", "STUDENT", "PARENT"];
  for (const role of order.filter((r) => roles.includes(r))) {
    for (const s of SUGGESTIONS[role] || []) {
      if (seen.has(s.en)) continue;
      seen.add(s.en);
      out.push({ en: s.en, ne: s.ne });
    }
  }
  return out.slice(0, limit);
}

/**
 * Whether the user may use the assistant, and why not. Never throws.
 * @returns {{ ok: boolean, reason?: string, roles: string[], settings: object }}
 */
function access(user) {
  const settings = settingsFor(user);
  const roles = allowedAssistantRoles(user.roles, settings);
  if (!config.assistant.enabled) return { ok: false, reason: "disabled_on_server", roles, settings };
  if (!settings.enabled) return { ok: false, reason: "disabled_by_school", roles, settings };
  if (!roles.length) return { ok: false, reason: "role_not_allowed", roles, settings };
  if (!providerManager.isUsable(settings.provider)) return { ok: false, reason: "not_configured", roles, settings };
  return { ok: true, roles, settings };
}

/** What the widget needs on load. */
function bootstrap(user) {
  const a = access(user);
  return {
    enabled: a.ok,
    reason: a.ok ? null : a.reason,
    defaultLanguage: a.settings.defaultLanguage,
    autoDetect: a.settings.autoDetect,
    maxQuestionLength: MAX_QUESTION,
    dailyLimit: a.settings.userDailyLimit,
    suggestions: a.ok ? suggestionsFor(a.roles) : [],
    guides: a.ok ? guidesFor(a.roles) : [],
  };
}

const REFUSALS = {
  disabled_on_server: "The help assistant is switched off on this server.",
  disabled_by_school: "The help assistant is switched off for this school.",
  role_not_allowed: "The help assistant is not available for your account.",
  not_configured: "The help assistant's AI service is not set up yet. Please tell the school administrator.",
};

/**
 * Validate and prepare one question. Throws ApiError (403, 404, 429) before anything streams.
 * @param {object} user  req.user
 * @param {{ message: string, conversationId?: number, language?: string, context?: { route?: string } }} body
 */
async function startChat(user, body) {
  const a = access(user);
  if (!a.ok) throw ApiError.forbidden(REFUSALS[a.reason], "ASSISTANT_UNAVAILABLE");
  const { settings, roles } = a;
  const question = String(body.message || "").trim();
  if (!question) throw ApiError.badRequest("Type a question first");
  if (question.length > MAX_QUESTION) throw ApiError.badRequest(`Questions can be at most ${MAX_QUESTION} characters`);

  let conversation = null;
  if (body.conversationId) {
    conversation = await prisma.aiConversation.findFirst({
      where: { id: Number(body.conversationId), userId: user.id, schoolId: user.schoolId },
      select: { id: true },
    });
    if (!conversation) throw ApiError.notFound("Conversation not found");
  }

  await assertWithinLimits({ schoolId: user.schoolId, userId: user.id, settings });
  purgeExpiredConversations(user.schoolId, settings.retentionDays);

  const lang = resolveLanguage({ preference: body.language, message: question, settings });
  const context = resolveContext(body.context?.route, roles);

  // Retrieval: the question first; the current page's documents when the question matches nothing.
  let hits = knowledge.search(question, { roles, context, limit: 3 });
  if (!hits.length) hits = knowledge.documentsForPage(context, roles).slice(0, 2).map((doc) => ({ doc, score: 0 }));
  if (!hits.length) {
    const around = knowledge.getDocument("getting-around");
    if (around) hits = [{ doc: around, score: 0 }];
  }
  const docs = hits.map((h) => h.doc);

  // Walkthroughs come from the documents, never from the model.
  const allowedGuides = new Map(guidesFor(roles).map((g) => [g.id, g]));
  const guides = [...new Set(docs.slice(0, 2).flatMap((d) => d.guides))].filter((id) => allowedGuides.has(id)).map((id) => allowedGuides.get(id));

  const history = conversation
    ? (
        await prisma.aiMessage.findMany({
          where: { conversationId: conversation.id, schoolId: user.schoolId },
          select: { role: true, content: true },
          orderBy: { id: "desc" },
          take: HISTORY_LOAD,
        })
      ).reverse()
    : [];

  const prompt = buildPrompt({ roles, language: lang.language, romanized: !!lang.detected?.romanized, context, docs, history, question });

  if (!conversation) {
    conversation = await prisma.aiConversation.create({
      data: {
        schoolId: user.schoolId,
        userId: user.id,
        title: question.replace(/\s+/g, " ").slice(0, 120),
        language: ["en", "ne"].includes(body.language) ? body.language : "auto",
      },
      select: { id: true },
    });
  }
  const userMessage = await prisma.aiMessage.create({
    data: {
      schoolId: user.schoolId,
      conversationId: conversation.id,
      role: "user",
      content: question,
      route: context?.pattern ?? null,
      module: context?.module ?? null,
      language: lang.language,
    },
    select: { id: true },
  });
  await prisma.aiConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

  return {
    user: { id: user.id, schoolId: user.schoolId, role: roles[0] },
    settings,
    conversationId: conversation.id,
    userMessageId: userMessage.id,
    language: lang.language,
    context,
    sources: docs.map((d) => ({ id: d.id, title: d.title })),
    guides,
    prompt,
  };
}

/**
 * Run a prepared chat. Yields { event, data } pairs for the client.
 * @param {object} chat  from startChat
 * @param {AbortSignal} [signal]  aborted when the client disconnects or presses stop
 */
async function* runChat(chat, signal) {
  yield {
    event: "meta",
    data: { conversationId: chat.conversationId, userMessageId: chat.userMessageId, language: chat.language, context: chat.context, sources: chat.sources, guides: chat.guides },
  };

  let text = "";
  let attempt = { provider: chat.settings.provider, model: chat.settings.model, fellBack: false };
  const started = Date.now();
  const base = { schoolId: chat.user.schoolId, userId: chat.user.id, role: chat.user.role, language: chat.language, module: chat.context?.module };

  try {
    for await (const ev of providerManager.streamAnswer(chat.settings, { ...chat.prompt, maxOutputTokens: chat.settings.maxOutputTokens, temperature: chat.settings.temperature }, { signal })) {
      if (ev.type === "attempt") {
        attempt = ev;
        if (ev.fellBack) text = "";
      } else if (ev.type === "delta") {
        text += ev.text;
        yield { event: "delta", data: { text: ev.text } };
      } else if (ev.type === "done") {
        const usage = await recordUsage({ ...base, provider: ev.provider, model: ev.model, inputTokens: ev.usage.inputTokens, outputTokens: ev.usage.outputTokens, latencyMs: ev.latencyMs, status: "ok", fellBack: ev.fellBack });
        const answer = text.trim() || USER_MESSAGES.unknown;
        const message = await saveAnswer(chat, answer, usage?.id ?? null);
        yield {
          event: "done",
          data: { messageId: message.id, provider: ev.provider, fellBack: ev.fellBack, truncated: ev.finishReason === "length", usage: ev.usage },
        };
        return;
      }
    }
  } catch (err) {
    const code = err.code || CODES.UNKNOWN;
    const aborted = code === CODES.ABORTED;
    await recordUsage({ ...base, provider: err.provider || attempt.provider, model: err.model || attempt.model, latencyMs: Date.now() - started, status: aborted ? "aborted" : "error", errorCode: aborted ? null : code, fellBack: !!err.fellBack });
    // Keep whatever part of the answer arrived, marked as incomplete.
    let messageId = null;
    if (text.trim()) messageId = (await saveAnswer(chat, `${text.trim()}\n\n_(${aborted ? "stopped" : "answer interrupted"})_`, null)).id;
    if (!aborted) yield { event: "error", data: { code, message: USER_MESSAGES[code] || USER_MESSAGES.unknown, messageId } };
  }
}

async function saveAnswer(chat, content, usageEventId) {
  const message = await prisma.aiMessage.create({
    data: {
      schoolId: chat.user.schoolId,
      conversationId: chat.conversationId,
      role: "assistant",
      content,
      route: chat.context?.pattern ?? null,
      module: chat.context?.module ?? null,
      language: chat.language,
      sources: chat.sources,
      guideIds: chat.guides.map((g) => g.id),
      usageEventId,
    },
    select: { id: true },
  });
  await prisma.aiConversation.update({ where: { id: chat.conversationId }, data: { lastMessageAt: new Date() } });
  return message;
}

module.exports = { bootstrap, startChat, runChat, access, settingsFor, guidesFor, suggestionsFor, GUIDES, SUGGESTIONS };
