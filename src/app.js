require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

const app = express();

// ═══════════════════════════════════════════════════════════════
// CORS ULTRA-DEFINITIVO - Funciona em 100% dos casos
// ═══════════════════════════════════════════════════════════════

const allowedOrigins = [
  'https://mediato-nexus-ai.lovable.app',
  'https://mediatio-vehicle-nexus.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
];

// ✅ PRIORIDADE MÁXIMA: Primeiro middleware a executar
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Decidir qual origin retornar
  let allowOrigin = '*'; // Default permissivo para debug
  
  if (origin && allowedOrigins.includes(origin)) {
    allowOrigin = origin; // Origem específica se estiver na lista
  }
  // Adicione temporariamente no app.js para teste
app.get('/api/test-cors', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Se você está vendo isso, CORS GET funciona!',
    origin: req.headers.origin,
    timestamp: Date.now()
  });
});
  
  // FORÇAR headers CORS (mesmo que outros middlewares tentem remover)
  res.header('Access-Control-Allow-Origin', allowOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', '*'); // Permissivo total
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Vary', 'Origin'); // Importante para cache
  
  // Log detalhado
  logger.info(`🌐 CORS: ${req.method} ${req.path} | Origin: ${origin || 'none'} | Allow: ${allowOrigin}`);
  
  // Responder OPTIONS imediatamente (204 No Content)
  if (req.method === 'OPTIONS') {
    logger.info(`✅ OPTIONS preflight respondido para ${origin}`);
    return res.status(204).send();
  }
  
  next();
});

// ═══════════════════════════════════════════════════════════════
// RESTO DA APLICAÇÃO
// ═══════════════════════════════════════════════════════════════

// Helmet configurado para NÃO interferir em CORS
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  hsts: false, // Desabilita HSTS que pode causar problemas em dev
}));

app.use(compression());

// Rate limiting (excluir OPTIONS do rate limit)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  next();
});

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, error: 'Muitas requisições. Tente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Não contar OPTIONS
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger de requisições
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    node: process.version,
    cors: 'enabled',
  });
});

// Teste CORS específico
app.get('/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS está funcionando!',
    yourOrigin: req.headers.origin,
    timestamp: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════
// ROTAS DA API
// ═══════════════════════════════════════════════════════════════

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

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.path}`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ message: err.message, path: req.path, stack: err.stack });

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

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Erro interno do servidor',
  });
});

module.exports = app;