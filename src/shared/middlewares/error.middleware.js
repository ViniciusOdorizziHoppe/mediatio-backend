const logger = require('../../config/logger');
const env = require('../../config/env');

const errorMiddleware = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user?.id
  });
  
  // Zod validation error
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }
  
  // MongoDB duplicate key
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Registro duplicado',
      field: Object.keys(err.keyValue)[0]
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
  
  const statusCode = err.statusCode || 500;
  const message = env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor' 
    : err.message;
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorMiddleware;