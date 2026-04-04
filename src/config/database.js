const mongoose = require('mongoose');
const logger = require('./logger');
const env = require('./env');

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('✅ MongoDB conectado com sucesso');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;