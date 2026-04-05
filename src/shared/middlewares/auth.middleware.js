/**
 * Middleware de autenticação dual:
 * - JWT normal (Authorization: Bearer token) para o frontend
 * - X-Bot-Key para os bots N8N (sem precisar de JWT rotativo)
 *
 * Configurar no Koyeb: BOT_API_KEY=mediatio-bot-2026
 */
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    // 1. Verificar X-Bot-Key (para N8N e bots)
    const botKey = req.headers['x-bot-key'];
    if (botKey) {
      const validBotKey = process.env.BOT_API_KEY || 'mediatio-bot-2026';
      if (botKey === validBotKey) {
        req.user = { id: 'bot-service', email: 'bot@mediatio.com', role: 'bot' };
        return next();
      }
      return res.status(401).json({ success: false, error: 'Bot key inválida' });
    }

    // 2. JWT normal (frontend)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expirado' });
    }
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
};

module.exports = auth;
