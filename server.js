// server.js – FORCE REDEPLOY 2026-04-05
require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 8000;

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Servidor rodando na porta ${PORT}`);
    logger.info(`🌐 CORS ativo para: ${process.env.FRONTEND_URL || 'todas as origens'}`);
  });
});