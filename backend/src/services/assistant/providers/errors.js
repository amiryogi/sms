/**
 * One error type for every AI provider, so nothing above the adapters ever sees an SDK's
 * own error classes or response shapes.
 *
 * `code` says what went wrong in provider-neutral terms. Two flags drive the fallback rule
 * in providerManager.js:
 *  - `retryable`: trying again later (or elsewhere) may work;
 *  - `mayHaveProcessed`: the provider may already have run (and billed) the request, so it
 *    must not be sent again anywhere (spec: no retry of a possibly-processed request).
 */

const CODES = Object.freeze({
  AUTH: "auth", // key missing, wrong or not allowed
  NOT_CONFIGURED: "not_configured", // no key installed on this server
  MODEL_NOT_FOUND: "model_not_found",
  RATE_LIMITED: "rate_limited",
  TIMEOUT: "timeout",
  UNAVAILABLE: "unavailable", // provider down, overloaded, network failure
  BAD_REQUEST: "bad_request",
  CONTENT_FILTERED: "content_filtered", // the provider declined to answer
  ABORTED: "aborted", // the user stopped it or left the page
  UNKNOWN: "unknown",
});

/** Plain-language messages for users; the frontend translates by code. */
const USER_MESSAGES = Object.freeze({
  auth: "The assistant's AI service is not set up correctly. Please tell the school administrator.",
  not_configured: "The assistant's AI service is not set up on this server yet.",
  model_not_found: "The AI model chosen for the assistant is not available. Please tell the school administrator.",
  rate_limited: "The assistant is busy right now. Please try again in a minute.",
  timeout: "The assistant took too long to answer. Please try again.",
  unavailable: "The assistant's AI service is not reachable right now. Please try again shortly.",
  bad_request: "The assistant could not answer that question. Please rephrase it.",
  content_filtered: "The assistant can't answer that question.",
  aborted: "Stopped.",
  unknown: "Something went wrong with the assistant. Please try again.",
});

class AssistantProviderError extends Error {
  /**
   * @param {string} code  one of CODES
   * @param {string} message  technical message for logs (never shown to users)
   * @param {object} [opts]
   */
  constructor(code, message, { provider = null, status = null, retryable, mayHaveProcessed = false, cause } = {}) {
    super(message);
    this.name = "AssistantProviderError";
    this.code = code;
    this.provider = provider;
    this.status = status;
    this.retryable = retryable ?? [CODES.RATE_LIMITED, CODES.TIMEOUT, CODES.UNAVAILABLE].includes(code);
    this.mayHaveProcessed = mayHaveProcessed;
    if (cause) this.cause = cause;
  }

  get userMessage() {
    return USER_MESSAGES[this.code] || USER_MESSAGES.unknown;
  }
}

/**
 * Map an HTTP status from any provider to a code.
 * @param {number} status
 */
function codeForStatus(status) {
  if (status === 401 || status === 403) return CODES.AUTH;
  if (status === 404) return CODES.MODEL_NOT_FOUND;
  if (status === 408 || status === 504) return CODES.TIMEOUT;
  if (status === 429) return CODES.RATE_LIMITED;
  if (status === 400 || status === 413 || status === 422) return CODES.BAD_REQUEST;
  if (status >= 500) return CODES.UNAVAILABLE;
  return CODES.UNKNOWN;
}

/** An AbortError from fetch/undici, or an SDK's own "user abort" error. */
const isAbortError = (err) =>
  !!err && (err.name === "AbortError" || err.name === "APIUserAbortError" || err.constructor?.name === "APIUserAbortError");

/**
 * Fallback for errors an adapter does not recognise: keep an existing
 * AssistantProviderError, map an HTTP status if there is one, otherwise "unknown".
 * Timeouts: the request reached the provider, which may still run and bill it.
 */
function toProviderError(err, provider) {
  if (err instanceof AssistantProviderError) return err;
  if (isAbortError(err)) return new AssistantProviderError(CODES.ABORTED, "Request aborted", { provider, cause: err });
  const status = typeof err?.status === "number" ? err.status : null;
  if (status) {
    const code = codeForStatus(status);
    return new AssistantProviderError(code, `${provider} returned HTTP ${status}`, {
      provider,
      status,
      mayHaveProcessed: code === CODES.TIMEOUT,
      cause: err,
    });
  }
  return new AssistantProviderError(CODES.UNKNOWN, `${provider}: ${err?.message || "unknown error"}`, { provider, cause: err });
}

module.exports = { CODES, USER_MESSAGES, AssistantProviderError, codeForStatus, isAbortError, toProviderError };
