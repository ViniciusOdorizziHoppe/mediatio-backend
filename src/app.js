const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

const app = express();

// ── CORS DEFINITIVO (resolvido) ──────────────────────────────
// Permitir todas as origens temporariamente para testes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  credentials: false, // Mudar para true se precisar de cookies, mas com origin '*' não funciona
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// ── Segurança (relaxada para testes) ─────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false
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

// ── Logging ──────────────────────────────────────────────────
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
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

// ── Rotas da API (simplificadas e todas em um arquivo) ───────
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Modelos
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const VehicleSchema = new mongoose.Schema({
  codigo: String,
  tipo: String,
  marca: String,
  modelo: String,
  ano: Number,
  cor: String,
  km: Number,
  precos: {
    compra: Number,
    venda: Number,
    minimo: Number
  },
  condicoes: {
    aceitaTroca: Boolean,
    aceitaFinanciamento: Boolean,
    documentacao: String
  },
  proprietario: {
    nome: String,
    whatsapp: String,
    cidade: String
  },
  pipeline: {
    status: { type: String, default: 'disponivel' },
    dataEntrada: { type: Date, default: Date.now }
  },
  cadastradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);

const LeadSchema = new mongoose.Schema({
  nome: String,
  whatsapp: String,
  interesse: Object,
  status: { type: String, default: 'novo' },
  criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);

// ── Auth Routes ──────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    console.log('📝 Registro recebido:', { name, email });
    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Nome, email e senha são obrigatórios' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email já cadastrado' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    
    console.log('✅ Usuário criado:', user._id);
    
    res.status(201).json({ 
      success: true, 
      data: { id: user._id, name: user.name, email: user.email } 
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar usuário: ' + error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login recebido:', { email });
    
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
      process.env.JWT_SECRET || 'temp_secret_change_this',
      { expiresIn: '7d' }
    );
    
    console.log('✅ Login bem-sucedido:', user._id);
    
    res.json({ 
      success: true, 
      data: { token, user: { id: user._id, name: user.name, email: user.email } } 
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, error: 'Erro ao fazer login: ' + error.message });
  }
});

// ── Middleware de autenticação ──────────────────────────────
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'temp_secret_change_this');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
  }
};

// ── Vehicle Routes ──────────────────────────────────────────
app.get('/api/vehicles', authMiddleware, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ cadastradoPor: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: vehicles });
  } catch (error) {
    console.error('List vehicles error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar veículos' });
  }
});

app.post('/api/vehicles', authMiddleware, async (req, res) => {
  try {
    const count = await Vehicle.countDocuments({ tipo: req.body.tipo });
    const year = new Date().getFullYear();
    const prefix = req.body.tipo === 'moto' ? 'MOTO' : 'CARRO';
    const codigo = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
    
    const vehicle = new Vehicle({
      ...req.body,
      codigo,
      cadastradoPor: req.user.id
    });
    
    await vehicle.save();
    res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar veículo' });
  }
});

app.patch('/api/vehicles/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, cadastradoPor: req.user.id },
      { 'pipeline.status': status },
      { new: true }
    );
    
    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Veículo não encontrado' });
    }
    
    res.json({ success: true, data: vehicle });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar status' });
  }
});

// ── Lead Routes ──────────────────────────────────────────────
app.get('/api/leads', authMiddleware, async (req, res) => {
  try {
    const leads = await Lead.find({ criadoPor: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: leads });
  } catch (error) {
    console.error('List leads error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar leads' });
  }
});

app.post('/api/leads', authMiddleware, async (req, res) => {
  try {
    const lead = new Lead({
      ...req.body,
      criadoPor: req.user.id
    });
    await lead.save();
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar lead' });
  }
});

// ── Rota de teste CORS ──────────────────────────────────────
app.options('/api/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.sendStatus(200);
});

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Rota não encontrada' });
});

// ── Error handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message
  });
});

module.exports = app;