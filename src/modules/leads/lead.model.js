// src/modules/leads/lead.model.js
const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  whatsapp: { type: String, required: true, index: true },
  interesse: {
    descricao: String,
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }
  },
  canal: { type: String, enum: ['whatsapp', 'facebook', 'olx', 'site'], default: 'whatsapp' },
  status: { 
    type: String, 
    enum: ['novo', 'contatado', 'interessado', 'proposta_enviada', 'fechado', 'perdido'],
    default: 'novo',
    index: true
  },
  ultimoContato: Date,
  notas: String,
  criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

leadSchema.index({ whatsapp: 1, status: 1 });

module.exports = mongoose.model('Lead', leadSchema);