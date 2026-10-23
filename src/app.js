const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const interactionRoutes = require('./routes/interactionRoutes');
const doseRoutes = require('./routes/doseRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const locationRoutes = require('./routes/locationRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');

const createApp = (mongoUri) => {
  const app = express();
  const dbUri = mongoUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medikit';

  // Security Headers via Helmet with relaxed CSP for CDNs (GSAP, Lucide icons, Google Fonts)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdnjs.cloudflare.com',
            'https://unpkg.com',
            'https://cdn.jsdelivr.net',
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
            'https://cdnjs.cloudflare.com',
            'https://cdn.jsdelivr.net',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
          imgSrc: ["'self'", 'data:', 'https:', 'http:'],
          connectSrc: ["'self'", 'https://nominatim.openstreetmap.org'],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    })
  );

  // Body parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // MongoDB-backed persistent session store
  const isProd = process.env.NODE_ENV === 'production';
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'medikit_fallback_session_secret_2026',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: dbUri,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60, // 14 days
        autoRemove: 'native',
      }),
      cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 14 * 24 * 60 * 60 * 1000,
      },
    })
  );

  // Serve static files from public/
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: 'MediKit API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Versioned API v1 Router
  const apiRouter = express.Router();
  apiRouter.use(apiLimiter);
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/patients', patientRoutes);
  apiRouter.use('/prescriptions', prescriptionRoutes);
  apiRouter.use('/interactions', interactionRoutes);
  apiRouter.use('/doses', doseRoutes);
  apiRouter.use('/notifications', notificationRoutes);
  apiRouter.use('/locations', locationRoutes);
  apiRouter.use('/pharmacy', pharmacyRoutes);
  apiRouter.use('/dashboard', dashboardRoutes);

  app.use('/api/v1', apiRouter);

  // Global 404 for undefined API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route '${req.originalUrl}' not found.`,
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('[Unhandled Server Error]', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error.',
    });
  });

  return app;
};

module.exports = createApp;
