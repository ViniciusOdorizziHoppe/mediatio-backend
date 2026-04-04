const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async (retries = 5) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅ MongoDB conectado: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => logger.error('MongoDB erro:', err));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB desconectado'));
  } catch (err) {
    logger.error(`❌ MongoDB falhou: ${err.message}`);
    if (retries > 0) {
      logger.info(`Reconectando... (${retries} tentativas restantes)`);
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      logger.error('Falha definitiva ao conectar ao MongoDB');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
