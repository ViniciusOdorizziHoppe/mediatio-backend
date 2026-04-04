const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    phone: String,
    role: {
      type: String,
      enum: ['admin', 'socio', 'colaborador'],
      default: 'colaborador',
    },
    ativo: { type: Boolean, default: true },
    ultimoLogin: Date,
  },
  { timestamps: true }
);

// Hash senha antes de salvar
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Método para comparar senha
userSchema.methods.comparePassword = async function (senha) {
  return bcrypt.compare(senha, this.password);
};

// Não retornar senha no JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
