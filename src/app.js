/**
 * MEDIATIO — Motor Match API
 * app.js v4.0 — Backend simplificado
 *
 * Com o proxy do Vercel no frontend, o backend não precisa mais
 * de configuração complexa de CORS. As chamadas chegam do servidor
 * do Vercel (sem origin do browser), então `origin` será undefined
 * e todas as requisições são permitidas.
 *
 * Mantemos CORS básico para compatibilidade com Postman, N8N, curl, etc.
 */

require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const logger  = require('./config/logger');

const app = express();

// ════════════════════════════════════════════════════════════
// 1. CORS — simples e funcional
//    Com proxy Vercel, as calls chegam sem origin (server-side)
//    e são automaticamente permitidas.
// ════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  const origin = req.headers.origin;

  const ALLOWED = [
    'https://mediatio-vehicle-nexus.vercel.app',
    'https://mediato-nexus-ai.lovable.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
  ];

  // Sem origin (Vercel proxy, N8N, Postman, curl) = permitir
  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    // Origem desconhecida mas ainda seta header para não travar
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    logger.warn(`Origem não listada (permitida): ${origin}`);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Bot-Key,X-Requested-With,Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

// ════════════════════════════════════════════════════════════
// 2. SEGURANÇA
// ════════════════════════════════════════════════════════════
app.use(helmet({
  contentSecurityPolicy:     false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy:   false,
}));
app.use(compression());

// ════════════════════════════════════════════════════════════
// 3. RATE LIMIT
// ════════════════════════════════════════════════════════════
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // mais permissivo pois requests já vêm do Vercel
  skip: (req) => req.method === 'OPTIONS',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas requisições. Tente em 15 minutos.' },
}));

// ════════════════════════════════════════════════════════════
// 4. BODY PARSERS
// ════════════════════════════════════════════════════════════
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ════════════════════════════════════════════════════════════
// 5. LOG
// ════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} | origin: ${req.headers.origin || 'sem-origin'}`);
  next();
});

// ════════════════════════════════════════════════════════════
// 6. HEALTH CHECK
// ════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()) + 's',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    node: process.version,
  });
});

// ════════════════════════════════════════════════════════════
// 7. ROTAS DA API
// ════════════════════════════════════════════════════════════
const loadRoute = (path, file) => {
  try {
    app.use(path, require(file));
    logger.info(`✅ Rota carregada: ${path}`);
  } catch (e) {
    logger.error(`❌ Falha ao carregar ${path}: ${e.message}`);
    app.use(path, (req, res) => {
      res.status(503).json({ success: false, error: `Módulo ${path} indisponível` });
    });
  }
};

loadRoute('/api/auth',      './modules/auth/auth.routes');
loadRoute('/api/vehicles',  './modules/vehicles/vehicle.routes');
loadRoute('/api/leads',     './modules/leads/lead.routes');
loadRoute('/api/analytics', './modules/analytics/analytics.routes');
loadRoute('/api/fipe',      './modules/integrations/fipe/fipe.routes');

// ════════════════════════════════════════════════════════════
// 8. 404 + ERROR HANDLER
// ════════════════════════════════════════════════════════════
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Rota não encontrada: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  logger.error(`Erro: ${err.message}`);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false, error: 'Dados inválidos',
      details: err.errors?.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
    });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    return res.status(409).json({ success: false, error: `Já existe registro com esse ${field}` });
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'Arquivo muito grande. Máximo: 10MB' });
  }

  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.statusCode || 500).json({
    success: false,
    error: isProd && !err.statusCode ? 'Erro interno do servidor' : err.message,
  });
});

module.exports = app;
