require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 8000;

// Conecta ao MongoDB antes de iniciar o servidor
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Mediatio API rodando na porta ${PORT}`);
    logger.info(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 Health: http://0.0.0.0:${PORT}/health`);
  });
}).catch((err) => {
  logger.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido, encerrando servidor...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error('Exceção não capturada:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Promise rejeitada não tratada:', reason);
  process.exit(1);
});
