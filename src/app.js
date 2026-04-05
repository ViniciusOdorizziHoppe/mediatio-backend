require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const logger = require('./config/logger');
const corsMiddleware = require('./config/cors');   // ← Seu cors.js
const env = require('./config/env');

const app = express();

// ═══════════════════════════════════════════════════════════
// MIDDLEWARES GLOBAIS (ordem crítica)
// ═══════════════════════════════════════════════════════════

// 1. CORS (primeiro! cuida de OPTIONS e headers)
app.use(corsMiddleware);

// 2. Segurança
app.use(helmet({
  contentSecurityPolicy: false,        // desativado para API
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
}));

// 3. Compressão
app.use(compression());

// 4. Rate Limit (aplicado só em /api/)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutos
  max: 300,                   // máximo 300 requisições
  skip: (req) => req.method === 'OPTIONS',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' }
});
app.use('/api/', apiLimiter);

// 5. Parsing de body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Log de requisições (útil no Koyeb)
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} | Origin: ${req.headers.origin || 'no-origin'} | IP: ${req.ip}`);
  next();
});

// ═══════════════════════════════════════════════════════════
// ROTAS
// ═══════════════════════════════════════════════════════════

// Health check
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Teste rápido de CORS
app.get('/cors-test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'CORS está funcionando corretamente',
    origin: req.headers.origin,
    allowedOrigins: env.ALLOWED_ORIGINS 
  });
});

// Rotas da API
try {
  app.use('/api/auth', require('./modules/auth/auth.routes'));
  app.use('/api/vehicles', require('./modules/vehicles/vehicle.routes'));
  app.use('/api/leads', require('./modules/leads/lead.routes'));
  app.use('/api/analytics', require('./modules/analytics/analytics.routes'));
  app.use('/api/fipe', require('./modules/integrations/fipe/fipe.routes'));
  // Adicione outras rotas aqui quando criar (nexus, morph, sheets, etc.)

  logger.info('✅ Todas as rotas carregadas com sucesso');
} catch (e) {
  logger.error(`❌ Erro ao carregar rotas: ${e.message}`);
}

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    error: `Rota não encontrada: ${req.method} ${req.path}` 
  });
});

// Error Handler Global
app.use((err, req, res, next) => {
  logger.error(`Erro não tratado: ${err.message}\n${err.stack}`);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;