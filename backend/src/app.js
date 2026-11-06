require("dotenv").config();

const express = require("express");
// Trigger restart 2
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const config = require("./config");

const { errorHandler, notFound } = require("./middleware/error.middleware");
const routes = require("./routes");

const app = express();

// =====================================================
// PROXY TRUST (required for correct req.ip / rate limiting)
// =====================================================

// IP-based rate limiting is only as reliable as `req.ip`.
//
//  - In development the API is reached directly (no proxy), so `trust proxy`
//    stays OFF and `req.ip` is the real socket address. Honouring
//    X-Forwarded-For here would let anyone forge their IP with a header.
//  - In production the API is expected to sit behind exactly ONE reverse proxy
//    (nginx / Caddy / a load balancer), so we trust exactly one hop. Express
//    then takes the IP one position in from the right-hand end of
//    X-Forwarded-For -- the value our own proxy appended -- and ignores
//    anything the client prepended.
//
// We deliberately do NOT use `trust proxy = true`: that trusts the entire
// X-Forwarded-For chain, letting a client spoof the header and get a fresh
// rate-limit bucket per request (express-rate-limit v7 flags this as
// ERR_ERL_PERMISSIVE_TRUST_PROXY). Override the hop count with TRUST_PROXY_HOPS
// if the deployment ever gains another proxy layer (e.g. Cloudflare + nginx).
// If NODE_ENV is unset we fall through to the dev branch on purpose: the worst
// case is that everyone behind the proxy shares one bucket (over-throttling),
// which fails closed, rather than accepting forged client IPs.
const trustProxyHops = parseInt(process.env.TRUST_PROXY_HOPS, 10);
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", Number.isNaN(trustProxyHops) ? 1 : trustProxyHops);
} else {
  app.set("trust proxy", Number.isNaN(trustProxyHops) ? false : trustProxyHops);
}

// =====================================================
// SECURITY MIDDLEWARE
// =====================================================

// Helmet for security headers (allow assets to be consumed cross-origin by the frontend)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// =====================================================
// BODY PARSING
// =====================================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// =====================================================
// LOGGING
// =====================================================

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// =====================================================
// STATIC FILES (Uploads)
// =====================================================

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "School Management System API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// =====================================================
// API ROUTES
// =====================================================

app.use("/api", routes);

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
