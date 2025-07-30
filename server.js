const express = require('express');
const passport = require('passport');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cron = require('node-cron');

// Load environment variables FIRST
require('dotenv').config();

// Load passport strategy AFTER env variables are loaded
require('./config/passport');

const routes = require('./routes/apiRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const scheduleController = require('./controllers/scheduleController');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
if (isProduction) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        scriptSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://accounts.google.com"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", "https://accounts.google.com", "https://content.googleapis.com"],
      },
    },
  }));
} else {
  // Development mode - more relaxed CSP for testing
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        scriptSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https://accounts.google.com", "https://www.googleapis.com"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", "https://accounts.google.com", "https://content.googleapis.com", "https://www.google.com"],
      },
    },
  }));
}

// CORS configuration
const corsOptions = {
  origin: isProduction 
    ? process.env.TRUSTED_ORIGINS?.split(',') || ['https://yourdomain.com']
    : ['http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// More strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Compression middleware
app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));
app.use('/admin', express.static('admin')); // Serve admin files under /admin path

app.use(passport.initialize()); 

// Apply auth rate limiting to auth routes
app.use('/api/auth', authLimiter, authRoutes); 
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api', routes);          

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (isProduction) {
    res.status(500).json({ error: 'Something went wrong!' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Cron job to apply scheduled business hours every day at midnight
cron.schedule('0 0 * * *', () => {
  console.log('Running scheduled business hours check...');
  scheduleController.applyScheduledBusinessHours();
}, {
  timezone: "America/Tijuana"
});

// Also check on server startup for any missed scheduled hours
console.log('Checking for any scheduled business hours to apply on startup...');
scheduleController.applyScheduledBusinessHours();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Production mode: ${isProduction ? 'enabled' : 'disabled'}`);
  console.log('⏰ Scheduled business hours cron job active');
});