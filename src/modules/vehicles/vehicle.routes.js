const express = require('express');
const router = express.Router();
const vehicleController = require('./vehicle.controller');
const { authMiddleware, botAuthMiddleware } = require('../../shared/middlewares/auth.middleware');

// ✅ NOVO: Rota para bot criar veículos (vendedores)
router.post('/bot', botAuthMiddleware, (req, res, next) => {
  // Bot usa BOT_USER_ID como usuário
  req.user = { id: process.env.BOT_USER_ID || 'admin' };
  vehicleController.create(req, res, next);
});

// Rota pública para bots listar veículos (X-Bot-Key)
router.get('/publico', botAuthMiddleware, (req, res, next) => {
  req.user = { id: process.env.BOT_USER_ID || 'admin' };
  vehicleController.list(req, res, next);
});

// Todas as demais rotas de veículos exigem autenticação JWT
router.use(authMiddleware);

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
