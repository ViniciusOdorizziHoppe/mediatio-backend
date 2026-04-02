require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 3001;

// Conecta ao banco antes de iniciar servidor
connectDB()
  .then(() => {
    // IMPORTANTE: '0.0.0.0' permite conexões externas no Koyeb
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Motor Match API rodando na porta ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    logger.error('❌ Falha ao conectar no MongoDB:', err.message);
    process.exit(1); // Encerra o processo se não conectar no banco
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando...');
  process.exit(0);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});