require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 8000;
// Debug imediato
console.log('🚀 Starting server...');

try {
  require('dotenv').config();
  console.log('✅ Dotenv loaded');

  const env = require('./src/config/env');
  console.log('✅ Env validated:', Object.keys(env).join(', '));

  const connectDB = require('./src/config/database');
  console.log('✅ Database module loaded');

  const logger = require('./src/config/logger');
  console.log('✅ Logger loaded');

  const app = require('./src/app');
  console.log('✅ App loaded');

  const PORT = process.env.PORT || 3001;

  connectDB()
    .then(() => {
      console.log('✅ Database connected');
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        logger.info(`Motor Match API rodando na porta ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('❌ Database connection failed:', err.message);
      process.exit(1);
    });

} catch (error) {
  console.error('❌ FATAL ERROR during startup:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  process.exit(0);
});

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