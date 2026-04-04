const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { error } = require('../utils/api-response');

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(error('Token não fornecido'));
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(error('Token expirado'));
    }
    return res.status(401).json(error('Token inválido'));
  }
};

module.exports = auth;
