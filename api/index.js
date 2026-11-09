/**
 * Vercel serverless entry: the whole Express API as one function.
 * vercel.json rewrites /api/* and /health here; Express still sees the
 * original URL, so its routes are unchanged. See docs/deploy-vercel.md.
 */
module.exports = require("../backend/src/app");
