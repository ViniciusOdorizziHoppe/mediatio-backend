const express = require('express');
const router = express.Router();
const controller = require('./vehicle.controller');
const auth = require('../../shared/middlewares/auth.middleware');
const validate = require('../../shared/middlewares/validate.middleware');
const { createVehicleSchema, updateStatusSchema } = require('./vehicle.schema');

// Todas as rotas precisam de autenticação
router.use(auth);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', validate(createVehicleSchema), controller.create);
router.patch('/:id', controller.update);
router.patch('/:id/status', validate(updateStatusSchema), controller.updateStatus);
router.post('/:id/generate-ad', controller.generateAd);
router.post('/:id/recalculate-score', controller.recalculateScore);

module.exports = router;