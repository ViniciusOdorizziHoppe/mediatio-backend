const express = require('express');
const router = express.Router();
const vehicleController = require('./vehicle.controller');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');

// Todas as rotas de veículos exigem autenticação
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
