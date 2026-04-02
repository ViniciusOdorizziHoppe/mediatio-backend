const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 tentativas
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 1 hora.'
  }
});

module.exports = {
  authLimiter
};