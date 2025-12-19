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

const { sequelize } = require('./models');
const routes = require('./routes/apiRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

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
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
  scriptSrcAttr: ["'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "https:", "http:"],
  connectSrc: ["'self'", "https://accounts.google.com", "https://www.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
  fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'self'", "https://accounts.google.com", "https://content.googleapis.com", "https://www.google.com"],
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
  connectSrc: ["'self'", "https://accounts.google.com", "https://www.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
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

app.use(passport.initialize());

// Mount API routers BEFORE static and catch-all routes
if (typeof authRoutes !== 'function' && typeof authRoutes !== 'object') {
  console.error('authRoutes is not a valid router. Check your export in routes/authRoutes.js');
} else {
  // app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/auth', authRoutes);
}
if (typeof adminRoutes !== 'function' && typeof adminRoutes !== 'object') {
  console.error('adminRoutes is not a valid router. Check your export in routes/adminRoutes.js');
} else {
  app.use('/api/admin', adminRoutes);
}
if (typeof routes !== 'function' && typeof routes !== 'object') {
  console.error('routes is not a valid router. Check your export in routes/apiRoutes.js');
} else {
  app.use('/api', routes);
}

// Static file serving AFTER API routers
app.use(express.static('public'));
app.use('/admin', express.static('admin')); // Serve admin files under /admin path

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

// /**
//  * Checks if a scheduled business hours update is due and applies it.
//  * This runs on server startup to handle pending schedule changes.
//  */
// async function promoteScheduleIfEffective() {
//   try {
//     // 1. Check for a scheduled update
//     const scheduledUpdate = await ScheduledBusinessHour.findOne({
//       attributes: ['effective_date'],
//       limit: 1
//     });
// 
//     if (!scheduledUpdate) {
//       console.log('No pending schedule updates found.');
//       return;
//     }
// 
//     const effectiveDate = new Date(scheduledUpdate.effective_date);
//     const today = new Date();
//     // Set time to 00:00:00 to compare dates only
//     effectiveDate.setUTCHours(0, 0, 0, 0);
//     today.setUTCHours(0, 0, 0, 0);
// 
//     // 2. If the effective date is today or in the past, promote the schedule
//     if (effectiveDate <= today) {
//       console.log(`Effective date ${effectiveDate.toISOString().split('T')[0]} reached. Promoting new schedule...`);
// 
//       await sequelize.transaction(async (t) => {
//         // 3. Clear the current business_hours
//         await BusinessHour.destroy({ where: {}, transaction: t });
// 
//         // 4. Copy the scheduled hours into the current business_hours table
//         const scheduledHours = await ScheduledBusinessHour.findAll({ transaction: t });
//         
//         if (scheduledHours.length > 0) {
//           const hoursToInsert = scheduledHours.map(h => ({
//             day_of_week: h.day_of_week,
//             is_open: h.is_open,
//             open_time: h.open_time,
//             close_time: h.close_time,
//             break_start: h.break_start,
//             break_end: h.break_end,
//             is_active: h.is_active
//           }));
//           
//           await BusinessHour.bulkCreate(hoursToInsert, { transaction: t });
//         }
// 
//         // 5. Clear the scheduled_business_hours table
//         await ScheduledBusinessHour.destroy({ where: {}, transaction: t });
//       });
// 
//       console.log('✅ New schedule promoted to primary.');
//     }
//   } catch (error) {
//     console.error('Error promoting scheduled business hours:', error);
//   }
// }

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Production mode: ${isProduction ? 'enabled' : 'disabled'}`);
  console.log('⏰ Scheduled business hours cron job active');
});

// Check for schedule updates on server startup.
// promoteScheduleIfEffective();