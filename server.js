require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`🚀 Mediatio API rodando na porta ${PORT}`);
    logger.info(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 Health: http://localhost:${PORT}/health`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido — encerrando servidor...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error('Erro não capturado:', err);
  process.exit(1);
});
