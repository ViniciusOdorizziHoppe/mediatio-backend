const mongoose = require('mongoose');
const logger = require('./logger');
const env = require('./env');

const connectDB = async (retries = 5) => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Eventos de monitoramento
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Tentando reconectar...');
    });
    
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    
    if (retries > 0) {
      logger.info(`Tentando reconectar... (${retries} tentativas restantes)`);
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      logger.error('Falha ao conectar ao MongoDB após múltiplas tentativas');
      process.exit(1);
    }
  }
};

module.exports = connectDB;