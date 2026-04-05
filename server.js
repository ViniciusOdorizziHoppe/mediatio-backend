const app = require('./app');
const connectDB = require('./config/database');
const logger = require('./config/logger');
const env = require('./config/env');

const PORT = env.PORT || 3001;

// Conectar ao MongoDB com retry
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 Mediatio API rodando na porta ${PORT}`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
      logger.info(`📡 Allowed Origins: ${env.ALLOWED_ORIGINS}`);
    });
  })
  .catch((err) => {
    logger.error(`❌ Falha fatal ao iniciar: ${err.message}`);
    process.exit(1);
  });