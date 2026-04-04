const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const logger = require('./config/logger');

const app = express();

// ── CORS configurado corretamente ────────────────────────────────
const allowedOrigins = [
  'https://mediato-nexus-ai.lovable.app',
  'https://mediatio-vehicle-nexus.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  process.env.FRONTEND_URL
].filter(Boolean);

// Middleware CORS
app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: mobile apps, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS bloqueou origem: ${origin}`);
      callback(null, false); // Não bloqueia com erro, só nega
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Handle preflight requests
app.options('*', cors());

// ── Segurança e performance ──────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(compression());

// ── Rate limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Muitas requisições, tente novamente mais tarde' }
});
app.use('/api/', limiter);

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging de requisições ────────────────────────────────────
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'unknown'}`);
  next();
});

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ── Rotas da API ──────────────────────────────────────────────
// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome, email e senha são obrigatórios' 
      });
    }
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const User = require('./modules/auth/auth.model');
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    
    res.status(201).json({ 
      success: true, 
      data: { id: user._id, name: user.name, email: user.email } 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'Email já cadastrado' });
    }
    logger.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar usuário' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const User = require('./modules/auth/auth.model');
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Email ou senha inválidos' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Email ou senha inválidos' });
    }
    
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      success: true, 
      data: { token, user: { id: user._id, name: user.name, email: user.email } } 
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Erro ao fazer login' });
  }
});

// Vehicle routes
app.get('/api/vehicles', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }
    
    const jwt = require('jsonwebtoken');
    const token = auth.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const Vehicle = require('./modules/vehicles/vehicle.model');
    const vehicles = await Vehicle.find({ cadastradoPor: decoded.id }).sort({ createdAt: -1 });
    
    res.json({ success: true, data: vehicles });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }
    logger.error('List vehicles error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar veículos' });
  }
});

app.post('/api/vehicles', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }
    
    const jwt = require('jsonwebtoken');
    const token = auth.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const Vehicle = require('./modules/vehicles/vehicle.model');
    const count = await Vehicle.countDocuments({ tipo: req.body.tipo });
    const year = new Date().getFullYear();
    const prefix = req.body.tipo === 'moto' ? 'MOTO' : 'CARRO';
    const codigo = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
    
    const vehicle = new Vehicle({
      ...req.body,
      codigo,
      cadastradoPor: decoded.id,
      'pipeline.status': 'disponivel',
      'pipeline.dataEntrada': new Date()
    });
    
    await vehicle.save();
    res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    logger.error('Create vehicle error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar veículo' });
  }
});

// Lead routes
app.get('/api/leads', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }
    
    const jwt = require('jsonwebtoken');
    const token = auth.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const Lead = require('./modules/leads/lead.model');
    const leads = await Lead.find({ criadoPor: decoded.id }).sort({ createdAt: -1 });
    
    res.json({ success: true, data: leads });
  } catch (error) {
    logger.error('List leads error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar leads' });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }
    
    const jwt = require('jsonwebtoken');
    const token = auth.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const Lead = require('./modules/leads/lead.model');
    const lead = new Lead({
      ...req.body,
      criadoPor: decoded.id,
      status: 'novo'
    });
    
    await lead.save();
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    logger.error('Create lead error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar lead' });
  }
});

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Rota não encontrada' });
});

// ── Error handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message
  });
});

module.exports = app;