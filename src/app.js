const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const logger = require('./config/logger');
const errorMiddleware = require('./shared/middlewares/error.middleware');
const { success } = require('./shared/utils/api-response');

// Rotas
const authRoutes = require('./modules/auth/auth.routes');
const vehicleRoutes = require('./modules/vehicles/vehicle.routes');
const leadRoutes = require('./modules/leads/lead.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const fipeRoutes = require('./modules/integrations/fipe/fipe.routes');

const app = express();

// ── Origens permitidas (CORS) ────────────────────────────────
const allowedOrigins = [
  'https://mediato-nexus-ai.lovable.app',
  'https://mediatio-vehicle-nexus.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      logger.warn(`CORS bloqueou origem: ${origin}`);
      callback(new Error(`Origem não permitida: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ADICIONE ESTA LINHA AQUI (crucial para preflight):
app.options('*', cors());

// ── Segurança e performance ──────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

// ── Rate limiting ────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  message: { success: false, error: 'Muitas requisições. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  message: { success: false, error: 'Muitas tentativas de login. Tente em 1 hora.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Body parsers ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request logger ───────────────────────────────────────────
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ── Health check (para Koyeb/Render) ────────────────────────
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json(
    success({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      node: process.version,
      env: process.env.NODE_ENV,
    })
  );
});

// ── Rotas da API ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/fipe', fipeRoutes);

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Rota não encontrada: ${req.method} ${req.path}` });
});

// ── Error handler global ─────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
