require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');

const { errorHandler, notFound } = require('./middleware/error.middleware');
const routes = require('./routes');

const app = express();

// =====================================================
// SECURITY MIDDLEWARE
// =====================================================

// Helmet for security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// =====================================================
// BODY PARSING
// =====================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================================================
// LOGGING
// =====================================================

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// =====================================================
// STATIC FILES (Uploads)
// =====================================================

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// =====================================================
// HEALTH CHECK
// =====================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'School Management System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// =====================================================
// API ROUTES
// =====================================================

app.use('/api', routes);

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
