const mongoose = require('mongoose');

// Counter atômico para sequenciais (ex.: codigo de veículo).
// Uso: findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { upsert: true, new: true })
// O operador $inc é atômico no MongoDB, eliminando race conditions
// que ocorrem ao fazer "find max + 1" em paralelo.
const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Counter', counterSchema);
