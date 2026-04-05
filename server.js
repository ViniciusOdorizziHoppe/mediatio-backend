require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');
// No início do server.js, antes de tudo
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
const PORT = process.env.PORT || 8000;

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌐 Health: https://localhost:${PORT}/health`);
    });
  })
  .catch(err => {
    console.error('❌ Erro MongoDB:', err.message);
    process.exit(1);
  });