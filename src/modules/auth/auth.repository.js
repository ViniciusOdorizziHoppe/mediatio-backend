const User = require('./auth.model');

class AuthRepository {
  async findByEmail(email) {
    return User.findOne({ email }).select('+password');
  }
  
  async findById(id) {
    return User.findById(id);
  }
  
  async create(userData) {
    const user = new User(userData);
    await user.save();
    return user;
  }
  
  async updateLastLogin(id) {
    return User.findByIdAndUpdate(id, { lastLogin: new Date() });
  }
}

module.exports = new AuthRepository();