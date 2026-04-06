const jwt = require('jsonwebtoken');
const User = require('./auth.model');
const logger = require('../../config/logger');

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
  return { accessToken, refreshToken };
};

class AuthService {
  async register(data) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      const err = new Error('Email já cadastrado');
      err.statusCode = 409;
      throw err;
    }

    const user = await User.create(data);
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Salva refresh token no usuário
    await User.findByIdAndUpdate(user._id, { refreshToken });

    logger.info(`Novo usuário registrado: ${user.email}`);
    return { user, accessToken, refreshToken };
  }

  async login(email, password) {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.active) {
      const err = new Error('Email ou senha inválidos');
      err.statusCode = 401;
      throw err;
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      const err = new Error('Email ou senha inválidos');
      err.statusCode = 401;
      throw err;
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    logger.info(`Login: ${user.email}`);
    return { user, accessToken, refreshToken };
  }

  async refreshToken(token) {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      const err = new Error('Refresh token inválido ou expirado');
      err.statusCode = 401;
      throw err;
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      const err = new Error('Refresh token inválido');
      err.statusCode = 401;
      throw err;
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('Usuário não encontrado');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }
}

module.exports = new AuthService();
