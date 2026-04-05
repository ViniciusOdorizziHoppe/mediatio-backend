require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

const app = express();

// ═══════════════════════════════════════════════════════════
// CORS NUCLEAR – intercepta TUDO antes de qualquer middleware
// ═══════════════════════════════════════════════════════════
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://mediato-nexus-ai.lovable.app',
    'https://mediatio-vehicle-nexus.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
  ];

  // Decide qual origin retornar
  let allowOrigin = '*';
  if (origin && allowedOrigins.includes(origin)) {
    allowOrigin = origin;
  }

  // FORÇA headers em TODA resposta
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Bot-Key');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Log obrigatório para debug (será visível no Koyeb)
  logger.info(`[CORS] ${req.method} ${req.path} | Origin: ${origin} | Allow: ${allowOrigin}`);

  // Responde OPTIONS imediatamente
  if (req.method === 'OPTIONS') {
    logger.info(`[CORS] OPTIONS preflight atendido para ${origin}`);
    return res.status(204).send();
  }

  next();
});

// ═══════════════════════════════════════════════════════════
// Helmet (sem bloqueio CORS)
// ═══════════════════════════════════════════════════════════
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
}));

app.use(compression());

// Rate limit (ignorar OPTIONS)
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skip: (req) => req.method === 'OPTIONS',
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Rota de teste CORS
app.get('/cors-test', (req, res) => {
  res.json({ success: true, message: 'CORS OK', origin: req.headers.origin });
});

// Rotas da API
try {
  app.use('/api/auth', require('./modules/auth/auth.routes'));
  app.use('/api/vehicles', require('./modules/vehicles/vehicle.routes'));
  app.use('/api/leads', require('./modules/leads/lead.routes'));
  app.use('/api/analytics', require('./modules/analytics/analytics.routes'));
  app.use('/api/fipe', require('./modules/integrations/fipe/fipe.routes'));
  logger.info('✅ Todas as rotas carregadas');
} catch (e) {
  logger.error(`Erro ao carregar rotas: ${e.message}`);
}

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: err.message });
});

module.exports = app;