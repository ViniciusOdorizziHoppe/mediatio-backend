const authService = require('./auth.service');
const { registerSchema, loginSchema, refreshSchema } = require('./auth.schema');
const { success } = require('../../shared/utils/api-response');

class AuthController {
  async register(req, res, next) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await authService.register(data);
      res.status(201).json(success({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }));
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const result = await authService.login(email, password);
      res.json(success({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }));
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const tokens = await authService.refreshToken(refreshToken);
      res.json(success(tokens));
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);
      res.json(success(user));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
