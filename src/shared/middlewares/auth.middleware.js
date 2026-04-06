const jwt = require('jsonwebtoken');
const logger = require('../../config/logger');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expirado' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }
    logger.error('Auth middleware erro:', err);
    return res.status(401).json({ success: false, error: 'Não autorizado' });
  }
};

/**
 * Middleware para autenticação de bots (N8N, Evolution API)
 */
const botAuthMiddleware = (req, res, next) => {
  const botKey = req.headers['x-bot-key'];
  const expectedKey = process.env.BOT_KEY || 'mediatio-bot-2026';

  if (!botKey || botKey !== expectedKey) {
    return res.status(401).json({ success: false, error: 'Chave de bot inválida' });
  }
  next();
};

module.exports = { authMiddleware, botAuthMiddleware };
