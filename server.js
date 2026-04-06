require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 3001;

// Conecta ao MongoDB e depois sobe o servidor
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 CORS ativo para: ${[
        'https://mediatio-vehicle-nexus.vercel.app',
        'https://mediato-nexus-ai.lovable.app',
        'http://localhost:5173',
      ].join(' | ')}`);
      logger.info(`📡 Health: http://localhost:${PORT}/health`);
    });
  })
  .catch((err) => {
    logger.error(`❌ Falha ao conectar ao banco: ${err.message}`);
    process.exit(1);
  });

// Shutdown limpo
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido — encerrando...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error(`Exceção não capturada: ${err.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Promise não tratada: ${reason}`);
});
