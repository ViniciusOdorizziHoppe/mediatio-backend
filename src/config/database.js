const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async (retries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info(`✅ MongoDB conectado: ${conn.connection.host}`);

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB erro:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB desconectado. Tentando reconectar...');
      });

      return conn;
    } catch (error) {
      logger.error(`MongoDB tentativa ${attempt}/${retries} falhou: ${error.message}`);
      if (attempt === retries) {
        logger.error('MongoDB: todas as tentativas esgotadas. Encerrando.');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

module.exports = connectDB;
