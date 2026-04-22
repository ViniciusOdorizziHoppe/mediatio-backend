const express = require('express');
const router = express.Router();
const appointmentController = require('./appointment.controller');
const { authMiddleware, botAuthMiddleware } = require('../../shared/middlewares/auth.middleware');

// ✅ NOVO: Rota para bot criar agendamentos (sem JWT)
router.post('/bot', botAuthMiddleware, (req, res, next) => {
  // Bot usa BOT_USER_ID como usuário
  req.user = { id: process.env.BOT_USER_ID || 'admin' };
  appointmentController.create(req, res, next);
});

// Rotas normais exigem JWT
router.use(authMiddleware);
router.get('/', (req, res, next) => appointmentController.list(req, res, next));
router.post('/', (req, res, next) => appointmentController.create(req, res, next));
router.put('/:id', (req, res, next) => appointmentController.update(req, res, next));
router.delete('/:id', (req, res, next) => appointmentController.delete(req, res, next));

module.exports = router;
