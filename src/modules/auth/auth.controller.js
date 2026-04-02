const authService = require('./auth.service');
const { success } = require('../../shared/utils/api-response');
const logger = require('../../config/logger');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      res.json(success(result));
    } catch (error) {
      logger.error('Login error:', error.message);
      next(error);
    }
  }
  
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(success(result));
    } catch (error) {
      logger.error('Register error:', error.message);
      next(error);
    }
  }
  
  async me(req, res, next) {
    try {
      const user = await authService.getProfile(req.user.id);
      res.json(success(user));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();