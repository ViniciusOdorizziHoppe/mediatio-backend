const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');

// POST /api/auth/register
router.post('/register', (req, res, next) => authController.register(req, res, next));

// POST /api/auth/login
router.post('/login', (req, res, next) => authController.login(req, res, next));

// POST /api/auth/refresh
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

// GET /api/auth/me (protegida)
router.get('/me', authMiddleware, (req, res, next) => authController.me(req, res, next));

module.exports = router;
