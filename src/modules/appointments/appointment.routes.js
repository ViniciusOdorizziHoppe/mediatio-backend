const express = require('express');
const router = express.Router();
const appointmentController = require('./appointment.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', (req, res, next) => appointmentController.list(req, res, next));
router.post('/', (req, res, next) => appointmentController.create(req, res, next));
router.put('/:id', (req, res, next) => appointmentController.update(req, res, next));
router.delete('/:id', (req, res, next) => appointmentController.delete(req, res, next));

module.exports = router;
