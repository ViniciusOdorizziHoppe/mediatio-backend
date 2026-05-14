const express = require('express');
const router = express.Router();
const leadController = require('./lead.controller');
const { authMiddleware, botAuthMiddleware } = require('../../shared/middlewares/auth.middleware');

// Rota para bot N8N (autenticação por X-Bot-Key)
router.post('/bot', botAuthMiddleware, (req, res, next) => leadController.botCreate(req, res, next));

// Demais rotas exigem JWT
router.use(authMiddleware);

// GET /api/leads
router.get('/', (req, res, next) => leadController.list(req, res, next));

// GET /api/leads/:id
router.get('/:id', (req, res, next) => leadController.getById(req, res, next));

// POST /api/leads
router.post('/', (req, res, next) => leadController.create(req, res, next));

// PATCH /api/leads/:id
router.patch('/:id', (req, res, next) => leadController.update(req, res, next));

// PATCH /api/leads/:id/status
router.patch('/:id/status', (req, res, next) => leadController.updateStatus(req, res, next));

// DELETE /api/leads/:id
router.delete('/:id', (req, res, next) => leadController.delete(req, res, next));

// PATCH /api/leads/:id/assign/:vehicleId — vincular lead a veiculo
router.patch('/:id/assign/:vehicleId', (req, res, next) => leadController.assignToVehicle(req, res, next));

module.exports = router;
