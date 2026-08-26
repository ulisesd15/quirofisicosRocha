// server.js
require('dotenv').config();

const express = require('express');
const passport = require('passport');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');

const { sequelize } = require('./backend/models');
const apiRoutes = require('./backend/routes/apiRoutes');
const authRoutes = require('./backend/routes/authRoutes');
const adminRoutes = require('./backend/routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

// Load your Passport Google strategy here if that file exists and is required.
// It must load after dotenv.config() and before passport.initialize().
// require('./backend/config/passport');

// --- Security ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://accounts.google.com',
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'https://accounts.google.com',
          'https://www.googleapis.com',
        ],
        fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
        frameSrc: [
          "'self'",
          'https://accounts.google.com',
          'https://content.googleapis.com',
          'https://www.google.com',
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
      },
    },
  })
);

// --- CORS ---
const trustedOrigins = process.env.TRUSTED_ORIGINS
  ? process.env.TRUSTED_ORIGINS
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

app.use(
  cors({
    origin: isProduction
      ? trustedOrigins
      : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.use(passport.initialize());

// --- Rate limits ---
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 300 : 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests from this IP, please try again later.',
    },
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
});

// --- API routes ---
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);

// --- API-only 404 ---
// This must be after all API routers and before the React SPA fallback.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// --- Serve the Vite React build in production ---
if (isProduction) {
  const dist = path.join(__dirname, 'frontend', 'dist');

  app.use(express.static(dist));

  /*
   * SPA fallback:
   * /appointment, /login, /mis-citas, /reschedule/:id,
   * /user-settings, and /auth-success must return index.html.
   *
   * /api routes already returned above, so this will not turn bad
   * API URLs into HTML responses.
   */
  app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
}

// --- Development-only non-API 404 ---
if (!isProduction) {
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json(
    isProduction
      ? { error: 'Something went wrong!' }
      : { error: err.message || 'Something went wrong!', stack: err.stack }
  );
});

// --- Boot ---
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    /*
     * Do not use sequelize.sync() here.
     * Your schema should be managed by Sequelize migrations.
     */
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Production mode: ${isProduction ? 'enabled' : 'disabled'}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully`);

    server.close(async () => {
      try {
        await sequelize.close();
        console.log('✅ Database connection closed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error closing database connection:', error);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error('Forced shutdown after 10 seconds');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})();