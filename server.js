require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./src/config/logger');

const PORT = process.env.PORT || 8000;

// Import app depois das configurações
const app = require('./src/app');

// Conectar ao MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('✅ MongoDB conectado com sucesso');
  } catch (error) {
    logger.error('❌ Erro ao conectar MongoDB:', error.message);
    process.exit(1);
  }
};

// Iniciar servidor
connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`🚀 Mediatio API rodando na porta ${PORT}`);
    logger.info(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 Health: http://localhost:${PORT}/health`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando...');
  mongoose.connection.close();
  process.exit(0);
});