const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const validate = require('../../shared/middlewares/validate.middleware');
const { authLimiter } = require('../../shared/middlewares/rate-limit.middleware');
const { loginSchema, registerSchema } = require('./auth.schema');

router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/register', validate(registerSchema), controller.register);
router.get('/me', require('../../shared/middlewares/auth.middleware'), controller.me);

module.exports = router;