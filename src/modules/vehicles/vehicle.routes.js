const express = require('express');
const router = express.Router();
const vehicleController = require('./vehicle.controller');
const { authMiddleware, botAuthMiddleware } = require('../../shared/middlewares/auth.middleware');
const { resolveBotUserId } = require('../../shared/utils/bot-user');

// Rota para bot criar veículos (vendedores)
router.post('/bot', botAuthMiddleware, async (req, res, next) => {
  try {
    const userId = await resolveBotUserId();
    req.user = { id: userId };
    vehicleController.create(req, res, next);
  } catch (err) {
    next(err);
  }
});

// ✅ NOVO: Rota para o bot mover veículo no pipeline (Kanban do frontend)
// durante as conversas com leads. Autenticada via X-Bot-Key, nao exige JWT
// e nao faz check de ownership (bot opera em nome do BOT_USER_ID).
router.patch('/:id/pipeline-bot', botAuthMiddleware, (req, res, next) => {
  vehicleController.updateStatusAsBot(req, res, next);
});

// Rota pública para bots listar veículos (X-Bot-Key)
router.get('/publico', botAuthMiddleware, async (req, res, next) => {
  try {
    const userId = await resolveBotUserId();
    req.user = { id: userId };
    vehicleController.list(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Todas as demais rotas de veículos exigem autenticação JWT
router.use(authMiddleware);

// GET /api/vehicles/_diag/codigo  — diagnóstico temporário (autenticado)
// Retorna: índices da coleção, max numérico real para CARRO/MOTO do ano,
// estado atual dos counters, total de docs por prefixo. Útil para
// identificar a causa do 409.
router.get('/_diag/codigo', async (req, res, next) => {
  try {
    const Vehicle = require('./vehicle.model');
    const Counter = require('../../shared/utils/counter.model');
    const vehicleRepository = require('./vehicle.repository');
    const year = new Date().getFullYear();

    const indexes = await Vehicle.collection.indexes();

    const carroMax = await vehicleRepository._maxCodigoNum('CARRO', year);
    const motoMax = await vehicleRepository._maxCodigoNum('MOTO', year);

    const carroCount = await Vehicle.countDocuments({ codigo: new RegExp(`^CARRO-${year}-`) });
    const motoCount = await Vehicle.countDocuments({ codigo: new RegExp(`^MOTO-${year}-`) });

    const carroSample = await Vehicle.find({ codigo: new RegExp(`^CARRO-${year}-`) })
      .select('codigo -_id').sort({ createdAt: -1 }).limit(20).lean();
    const motoSample = await Vehicle.find({ codigo: new RegExp(`^MOTO-${year}-`) })
      .select('codigo -_id').sort({ createdAt: -1 }).limit(20).lean();

    const counters = await Counter.find({}).lean();

    res.json({
      success: true,
      year,
      indexes,
      counters,
      carro: { max: carroMax, count: carroCount, recent20: carroSample.map((v) => v.codigo) },
      moto: { max: motoMax, count: motoCount, recent20: motoSample.map((v) => v.codigo) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles
router.get('/', (req, res, next) => vehicleController.list(req, res, next));

// GET /api/vehicles/:id
router.get('/:id', (req, res, next) => vehicleController.getById(req, res, next));

// POST /api/vehicles
router.post('/', (req, res, next) => vehicleController.create(req, res, next));

// PATCH /api/vehicles/:id
router.patch('/:id', (req, res, next) => vehicleController.update(req, res, next));

// PATCH /api/vehicles/:id/status
router.patch('/:id/status', (req, res, next) => vehicleController.updateStatus(req, res, next));

// DELETE /api/vehicles/:id
router.delete('/:id', (req, res, next) => vehicleController.delete(req, res, next));

// POST /api/vehicles/:id/generate-ad
router.post('/:id/generate-ad', (req, res, next) => vehicleController.generateAd(req, res, next));

// POST /api/vehicles/:id/recalculate-score
router.post('/:id/recalculate-score', (req, res, next) => vehicleController.recalculateScore(req, res, next));

module.exports = router;
