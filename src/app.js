require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const errorMiddleware = require('./shared/middlewares/error.middleware');

const app = express();

// ── Configuração de Proxy (Necessário para Koyeb/Vercel) ───────
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────
// NOTA: O frontend usa proxy Vercel (/api/* → Koyeb), então as
// requisições chegam sem Origin cross-origin. Mas mantemos CORS
// configurado para Postman, N8N, Evolution API e acesso direto.
const allowedOrigins = [
  'https://mediatio-vehicle-nexus.vercel.app',
  'https://mediato-nexus-ai.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem origin (Postman, N8N, curl, mobile)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn(`CORS bloqueado: ${origin}`);
    callback(new Error(`Origem não permitida: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Bot-Key', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ── Segurança ─────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ── Performance ───────────────────────────────────────────────
app.use(compression());

// ── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  message: { success: false, error: 'Muitas requisições. Tente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Body Parsers ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request Logger ────────────────────────────────────────────
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} | Origin: ${req.headers.origin || 'none'}`);
  next();
});

// ── Health Check ──────────────────────────────────────────────
const healthHandler = (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    node: process.version,
    env: process.env.NODE_ENV,
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ── Diagnóstico: listar índices das collections ───────────────
app.get('/api/debug/indexes', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const result = {};
    for (const col of collections) {
      const indexes = await db.collection(col.name).indexes();
      result[col.name] = indexes;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Diagnóstico: sincronizar índices do Mongoose (drop stale) ─
app.post('/api/debug/sync-indexes', async (req, res) => {
  try {
    const Vehicle = require('./modules/vehicles/vehicle.model');
    await Vehicle.syncIndexes();
    const mongoose = require('mongoose');
    const indexes = await mongoose.connection.db.collection('vehicles').indexes();
    res.json({ success: true, message: 'Índices sincronizados', data: indexes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Rotas da API ──────────────────────────────────────────────
const loadRoute = (path, mountPoint) => {
  try {
    const router = require(path);
    app.use(mountPoint, router);
    logger.info(`✅ Rota ${mountPoint} carregada`);
  } catch (e) {
    logger.error(`❌ Falha ao carregar ${mountPoint}: ${e.message}`);
  }
};

loadRoute('./modules/auth/auth.routes', '/api/auth');
loadRoute('./modules/vehicles/vehicle.routes', '/api/vehicles');
loadRoute('./modules/leads/lead.routes', '/api/leads');
loadRoute('./modules/appointments/appointment.routes', '/api/appointments');
loadRoute('./modules/analytics/analytics.routes', '/api/analytics');
loadRoute('./modules/integrations/fipe/fipe.routes', '/api/fipe');

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.path}`,
  });
});

// ── Error Handler Global ──────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
