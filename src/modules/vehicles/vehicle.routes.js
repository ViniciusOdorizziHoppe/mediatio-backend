const express = require('express');
const router = express.Router();
const vehicleController = require('./vehicle.controller');
const { authMiddleware, botAuthMiddleware } = require('../../shared/middlewares/auth.middleware');
const { resolveBotUserId } = require('../../shared/utils/bot-user');

// Lazy load do upload middleware (evita crash se cloudinary nao instalado)
const getUpload = () => require('../../shared/middlewares/upload.middleware').upload;

// Rota para bot criar veiculos (vendedores)
router.post('/bot', botAuthMiddleware, async (req, res, next) => {
  try {
    const userId = await resolveBotUserId();
    req.user = { id: userId };
    vehicleController.create(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Rota para o bot mover veiculo no pipeline (Kanban do frontend)
router.patch('/:id/pipeline-bot', botAuthMiddleware, (req, res, next) => {
  vehicleController.updateStatusAsBot(req, res, next);
});

// Rota publica para bots listar veiculos (X-Bot-Key)
router.get('/publico', botAuthMiddleware, async (req, res, next) => {
  try {
    const userId = await resolveBotUserId();
    req.user = { id: userId };
    vehicleController.list(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Todas as demais rotas de veiculos exigem autenticacao JWT
router.use(authMiddleware);

// GET /api/vehicles/_diag/codigo  — diagnostico temporario (autenticado)
router.get('/_diag/codigo', async (req, res, next) => {
  try {
    const Vehicle = require('./vehicle.model');
    const vehicleRepository = require('./vehicle.repository');
    const year = new Date().getFullYear();
    const pkg = require('../../../package.json');

    const indexes = await Vehicle.collection.indexes();
    const carroMax = await vehicleRepository._maxCodigoNum('CARRO', year);
    const motoMax = await vehicleRepository._maxCodigoNum('MOTO', year);
    const carroCount = await Vehicle.countDocuments({ codigo: new RegExp(`^CARRO-${year}-`) });
    const motoCount = await Vehicle.countDocuments({ codigo: new RegExp(`^MOTO-${year}-`) });
    const carroSample = await Vehicle.find({ codigo: new RegExp(`^CARRO-${year}-`) })
      .select('codigo -_id').sort({ createdAt: -1 }).limit(20).lean();
    const motoSample = await Vehicle.find({ codigo: new RegExp(`^MOTO-${year}-`) })
      .select('codigo -_id').sort({ createdAt: -1 }).limit(20).lean();

    res.json({
      success: true, year, apiVersion: pkg.version, indexes,
      carro: { max: carroMax, count: carroCount, recent20: carroSample.map((v) => v.codigo) },
      moto: { max: motoMax, count: motoCount, recent20: motoSample.map((v) => v.codigo) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles
router.get('/', (req, res, next) => vehicleController.list(req, res, next));

// POST /api/vehicles/:id/photos — upload de fotos (antes de /:id para nao conflitar)
router.post('/:id/photos', (req, res, next) => getUpload().array('photos', 10)(req, res, next), (req, res, next) => vehicleController.uploadPhotos(req, res, next));

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
