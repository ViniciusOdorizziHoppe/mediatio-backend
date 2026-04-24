const express = require('express');
const router = express.Router();
const appointmentController = require('./appointment.controller');
const { authMiddleware, botAuthMiddleware } = require('../../shared/middlewares/auth.middleware');
const { resolveBotUserId } = require('../../shared/utils/bot-user');

// Rota para bot criar agendamentos (sem JWT)
router.post('/bot', botAuthMiddleware, async (req, res, next) => {
  try {
    const userId = await resolveBotUserId();
    req.user = { id: userId };
    appointmentController.create(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Rotas normais exigem JWT
router.use(authMiddleware);
router.get('/', (req, res, next) => appointmentController.list(req, res, next));
router.post('/', (req, res, next) => appointmentController.create(req, res, next));
router.put('/:id', (req, res, next) => appointmentController.update(req, res, next));
router.delete('/:id', (req, res, next) => appointmentController.delete(req, res, next));

module.exports = router;
