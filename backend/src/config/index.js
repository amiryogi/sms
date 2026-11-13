const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

// Dev-only fallbacks. In production a missing secret is a hard startup failure:
// booting with a guessable signing key means anyone can mint valid tokens.
const DEV_JWT_SECRET = 'default-secret-change-in-production';
const DEV_JWT_REFRESH_SECRET = 'default-refresh-secret';

/**
 * Browser origins allowed by CORS: every entry of FRONTEND_URL (comma-separated, so a
 * deployment can list its Vercel address and a custom domain), plus the dev servers.
 * A trailing slash is dropped: browsers send the origin without one.
 * @param {string|undefined} value  the FRONTEND_URL env var
 */
function corsOrigins(value) {
  const listed = (value || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return [...new Set([...listed, 'http://localhost:5173', 'http://localhost:5174'])];
}

/**
 * Resolve a JWT signing secret.
 * @param {string} name   env var name, for the error message
 * @param {string|undefined} value  the env var value
 * @param {string} devFallback  fallback used outside production
 */
function requireSecret(name, value, devFallback) {
  if (value && value.trim()) return value;

  if (isProduction) {
    throw new Error(
      `[config] ${name} is not set. Refusing to start in production with a ` +
        'default signing secret — any attacker knowing it could forge tokens. ' +
        `Set ${name} in the environment (e.g. backend/.env) to a strong random ` +
        'value: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  return devFallback;
}

module.exports = {
  // JWT Configuration
  jwt: {
    secret: requireSecret('JWT_SECRET', process.env.JWT_SECRET, DEV_JWT_SECRET),
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: requireSecret(
      'JWT_REFRESH_SECRET',
      process.env.JWT_REFRESH_SECRET,
      DEV_JWT_REFRESH_SECRET
    ),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
    env,
  },

  // File Upload Configuration
  upload: {
    path: process.env.UPLOAD_PATH || './uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  },

  // Cloudinary Configuration (Optional)
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // CORS Configuration
  cors: {
    origin: corsOrigins(process.env.FRONTEND_URL),
  },

  // Pagination defaults
  pagination: {
    defaultPage: 1,
    defaultLimit: 10,
    maxLimit: 100,
  },
};
