const rateLimit = require('express-rate-limit');
const { ApiResponse } = require('../utils');

/**
 * Rate limiting middleware (express-rate-limit v7)
 *
 * Every limiter below uses a custom `handler` so a throttled request comes back
 * in this project's standard error envelope -- `{ success, message, errors? }`
 * via `ApiResponse.error` -- instead of express-rate-limit's default
 * `Too many requests, please try again later.` plain-text body. The frontend
 * (`frontend/src/api/apiClient.js` and every page that reads
 * `error.response.data.message`) depends on that envelope.
 *
 * NOTE ON IP RESOLUTION: these limiters key on `req.ip`, which is only
 * trustworthy if `app.set('trust proxy', ...)` is correct. See `src/app.js`.
 */

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * Build the 429 responder. Keeps the error shape in exactly one place.
 *
 * @param {string} message user-facing message
 */
const throttledHandler = (message) => (req, res /*, next, options */) => {
  const resetTime = req.rateLimit?.resetTime;
  const retryAfterSeconds = resetTime
    ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
    : undefined;

  // express-rate-limit already sets Retry-After, but be explicit: clients and
  // the frontend interceptor should always get a concrete backoff hint.
  if (retryAfterSeconds) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
  }

  const errors = retryAfterSeconds
    ? [`Please try again in ${retryAfterSeconds} second(s).`]
    : [];

  // { success: false, message, errors? } -- same shape as errorHandler emits.
  return ApiResponse.error(res, 429, message, errors);
};

/**
 * Shared options. `standardHeaders: 'draft-7'` emits the modern
 * `RateLimit`/`RateLimit-Policy` headers; the deprecated `X-RateLimit-*`
 * headers are switched off.
 */
const baseOptions = {
  windowMs: FIFTEEN_MINUTES,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

/**
 * STRICT limiter for `POST /auth/login`.
 *
 * 8 attempts per 15 minutes per IP, but `skipSuccessfulRequests: true` means a
 * 2xx login is not counted at all -- only failed attempts (401/400/5xx) burn
 * quota. A legitimate user who signs in normally can therefore never lock
 * themselves out, no matter how many times they log in and out.
 */
const loginLimiter = rateLimit({
  ...baseOptions,
  limit: 8,
  skipSuccessfulRequests: true,
  handler: throttledHandler(
    'Too many failed login attempts. Please wait a few minutes before trying again.'
  ),
});

/**
 * LOOSE limiter for `POST /auth/refresh-token`.
 *
 * The Axios response interceptor in `frontend/src/api/apiClient.js` fires a
 * refresh on ANY 401 and then retries the original request, so a single page
 * that fans out several parallel calls can legitimately produce several
 * refreshes in a second. On top of that, a whole school typically sits behind
 * one NAT'd public IP, so the per-IP bucket is shared by many real users.
 *
 * Two things keep this from breaking normal browsing:
 *   1. `skipSuccessfulRequests: true` -- a successful refresh (the normal case
 *      for the interceptor) costs nothing, so routine auto-refresh traffic
 *      never approaches the limit.
 *   2. A high ceiling (100 / 15 min) for the failures that remain. A failed
 *      refresh ends the session client-side (the interceptor clears storage and
 *      redirects to /login), so one user generates roughly one failure, not a
 *      stream of them.
 *
 * That still caps blind refresh-token guessing and stops the endpoint being
 * used as a cheap way to hammer the DB with token lookups.
 */
const refreshLimiter = rateLimit({
  ...baseOptions,
  limit: 100,
  skipSuccessfulRequests: true,
  handler: throttledHandler(
    'Too many token refresh attempts. Please sign in again.'
  ),
});

/**
 * GENERAL API limiter -- DEFINED BUT DELIBERATELY NOT APPLIED.
 *
 * This app does bulk marks entry and bulk report-card generation for a whole
 * class, which fire many requests in quick succession from one browser, and
 * most schools share a single public IP. Any blanket per-IP ceiling that is low
 * enough to be useful as abuse protection is also low enough to break those
 * flows, so wiring this up globally would be a functional regression.
 *
 * Export it so it can be applied selectively later -- e.g. to genuinely
 * expensive, non-bulk endpoints, or with a key generator based on
 * `req.user.id` rather than IP, which sidesteps the shared-IP problem.
 */
const apiLimiter = rateLimit({
  ...baseOptions,
  limit: 1000,
  handler: throttledHandler('Too many requests. Please slow down and try again shortly.'),
});

module.exports = {
  loginLimiter,
  refreshLimiter,
  apiLimiter,
};
