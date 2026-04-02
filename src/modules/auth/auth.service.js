const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const logger = require('../../config/logger');
const AuthRepository = require('./auth.repository');

class AuthService {
  constructor() {
    this.repository = AuthRepository;
  }
  
  async login(email, password) {
    const user = await this.repository.findByEmail(email);
    
    if (!user) {
      throw new Error('Credenciais inválidas');
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      throw new Error('Credenciais inválidas');
    }
    
    if (!user.active) {
      throw new Error('Usuário desativado');
    }
    
    await this.repository.updateLastLogin(user._id);
    
    const token = this.generateToken(user);
    
    return {
      user,
      token
    };
  }
  
  async register(userData) {
    const existingUser = await this.repository.findByEmail(userData.email);
    
    if (existingUser) {
      throw new Error('Email já cadastrado');
    }
    
    const user = await this.repository.create(userData);
    const token = this.generateToken(user);
    
    logger.info(`Novo usuário registrado: ${user.email}`);
    
    return {
      user,
      token
    };
  }
  
  async getProfile(userId) {
    return this.repository.findById(userId);
  }
  
  generateToken(user) {
    return jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
}

module.exports = new AuthService();