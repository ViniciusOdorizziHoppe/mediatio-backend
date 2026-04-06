/**
 * MEDIATIO — Motor Match API
 * app.js v3.0 — CORS definitivo
 *
 * Por que versões anteriores falhavam:
 * Quando qualquer middleware lança um erro (ex: env.js, cors.js, uma rota),
 * o Express passa para o error handler. Se o error handler responder SEM
 * os headers CORS já setados, o browser vê "sem Access-Control-Allow-Origin"
 * e reporta como erro de CORS — mesmo que o problema real seja um 500.
 *
 * Solução: Setar os headers CORS manualmente como PRIMEIRO middleware,
 * antes de tudo (antes do Helmet, cors package, env, rotas, etc).
 * Dessa forma TODA resposta — incluindo erros — terá os headers corretos.
 */

require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const logger  = require('./config/logger');

const app = express();

// ════════════════════════════════════════════════════════════
// 1. CORS MANUAL — PRIMEIRO DE TUDO
//    Seta headers em TODA resposta, antes de qualquer código
//    que possa lançar erro.
// ════════════════════════════════════════════════════════════
const ALLOWED_ORIGINS = [
  'https://mediatio-vehicle-nexus.vercel.app',
  'https://mediato-nexus-ai.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Se a origem está na lista, devolve ela; senão devolve a primeira permitida
  // (nunca '*' quando credentials: true)
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Bot-Key,X-Requested-With,Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');

  // Responde preflight OPTIONS imediatamente
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

// ════════════════════════════════════════════════════════════
// 2. SEGURANÇA (após CORS para não conflitar)
// ════════════════════════════════════════════════════════════
app.use(helmet({
  contentSecurityPolicy:    false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy:   false,
}));
app.use(compression());

// ════════════════════════════════════════════════════════════
// 3. RATE LIMIT (pula OPTIONS)
// ════════════════════════════════════════════════════════════
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
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
// 5. LOG DE REQUISIÇÕES
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
    cors: 'ativo',
    allowedOrigins: ALLOWED_ORIGINS,
  });
});

// Rota de debug CORS (remover em produção estável)
app.get('/cors-debug', (req, res) => {
  res.json({
    success: true,
    origin: req.headers.origin || 'sem-origin',
    headers: {
      'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
      'access-control-allow-methods': res.getHeader('Access-Control-Allow-Methods'),
    },
  });
});

// ════════════════════════════════════════════════════════════
// 7. ROTAS DA API
//    try/catch por módulo: se um módulo falhar, os outros carregam
// ════════════════════════════════════════════════════════════
const loadRoute = (path, routeFile) => {
  try {
    app.use(path, require(routeFile));
    logger.info(`✅ Rota carregada: ${path}`);
  } catch (e) {
    logger.error(`❌ Falha ao carregar ${path}: ${e.message}`);
    // Registra rota de erro para não deixar 404 silencioso
    app.use(path, (req, res) => {
      res.status(503).json({ success: false, error: `Módulo ${path} indisponível: ${e.message}` });
    });
  }
};

loadRoute('/api/auth',      './modules/auth/auth.routes');
loadRoute('/api/vehicles',  './modules/vehicles/vehicle.routes');
loadRoute('/api/leads',     './modules/leads/lead.routes');
loadRoute('/api/analytics', './modules/analytics/analytics.routes');
loadRoute('/api/fipe',      './modules/integrations/fipe/fipe.routes');

// ════════════════════════════════════════════════════════════
// 8. 404
// ════════════════════════════════════════════════════════════
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.path}`,
  });
});

// ════════════════════════════════════════════════════════════
// 9. ERROR HANDLER GLOBAL
//    Os headers CORS já foram setados no middleware 1, então
//    esta resposta de erro também terá Access-Control-Allow-Origin.
// ════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  logger.error(`Erro: ${err.message}\n${err.stack}`);

  // Zod
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      details: err.errors?.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
    });
  }
  // MongoDB duplicado
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    return res.status(409).json({ success: false, error: `Já existe um registro com esse ${field}` });
  }
  // JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
  }
  // Multer
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
