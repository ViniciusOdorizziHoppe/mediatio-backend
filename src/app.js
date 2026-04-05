require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

const app = express();

// ── CORS CONFIGURAÇÃO DEFINITIVA ─────────────────────────────
const allowedOrigins = [
  'https://mediato-nexus-ai.lovable.app',
  'https://mediatio-vehicle-nexus.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
];

// ✅ SOLUÇÃO: CORS com callback verificando origem dinamicamente
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (Postman, N8N, curl, mobile apps)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS bloqueado: ${origin}`);
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Bot-Key', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// ✅ Aplicar CORS em TODAS as rotas INCLUINDO preflight
app.use(cors(corsOptions));

// ✅ Handler específico para OPTIONS (garante resposta 204)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
  } else {
    next();
  }
});

// ── Segurança e performance ──────────────────────────────────
app.use(helmet({ 
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(compression());

// ── Rate limiting ────────────────────────────────────────────
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { success: false, error: 'Muitas requisições. Tente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ── Body parsers ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request logger ───────────────────────────────────────────
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    node: process.version,
  });
});

// ── Rotas da API ─────────────────────────────────────────────
try {
  const authRoutes = require('./modules/auth/auth.routes');
  app.use('/api/auth', authRoutes);
  logger.info('✅ Rota /api/auth carregada');
} catch (e) { logger.error('❌ auth.routes:', e.message); }

try {
  const vehicleRoutes = require('./modules/vehicles/vehicle.routes');
  app.use('/api/vehicles', vehicleRoutes);
  logger.info('✅ Rota /api/vehicles carregada');
} catch (e) { logger.error('❌ vehicle.routes:', e.message); }

try {
  const leadRoutes = require('./modules/leads/lead.routes');
  app.use('/api/leads', leadRoutes);
  logger.info('✅ Rota /api/leads carregada');
} catch (e) { logger.error('❌ lead.routes:', e.message); }

try {
  const analyticsRoutes = require('./modules/analytics/analytics.routes');
  app.use('/api/analytics', analyticsRoutes);
  logger.info('✅ Rota /api/analytics carregada');
} catch (e) { logger.error('❌ analytics.routes:', e.message); }

try {
  const fipeRoutes = require('./modules/integrations/fipe/fipe.routes');
  app.use('/api/fipe', fipeRoutes);
  logger.info('✅ Rota /api/fipe carregada');
} catch (e) { logger.error('❌ fipe.routes:', e.message); }

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.path}`,
  });
});

// ── Error handler global ─────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error({ message: err.message, path: req.path, origin: req.headers.origin, stack: err.stack });

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      details: err.errors?.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
    });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, error: 'Registro duplicado' });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
  if (err.message?.includes('Origem não permitida')) {
    return res.status(403).json({ success: false, error: err.message });
  }

  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.statusCode || 500).json({
    success: false,
    error: isProd && !err.statusCode ? 'Erro interno do servidor' : err.message,
  });
});

module.exports = app;