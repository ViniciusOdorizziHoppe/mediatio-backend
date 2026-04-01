require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 3001;

// Conecta ao banco antes de iniciar servidor
connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`🚀 Motor Match API rodando na porta ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando...');
  process.exit(0);
});