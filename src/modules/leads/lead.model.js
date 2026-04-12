const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
    },
    whatsapp: {
      type: String,
      required: [true, 'WhatsApp é obrigatório'],
      trim: true,
    },
    interesse: {
      descricao: String,
      vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
      },
    },
    canal: {
      type: String,
      enum: ['whatsapp', 'facebook', 'olx', 'site', 'indicacao', 'outro'],
      default: 'whatsapp',
    },
    status: {
      type: String,
      enum: ['novo', 'contatado', 'interessado', 'proposta_enviada', 'fechado', 'perdido'],
      default: 'novo',
    },
    orcamento: Number,
    cidade: String,
    ultimoContato: Date,
    historicoMensagens: [
      {
        role: { type: String, enum: ['user', 'assistant', 'system'], default: 'user' },
        content: String,
        timestamp: { type: Date, default: Date.now },
      }
    ],
    notas: String,
    criadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

leadSchema.index({ criadoPor: 1, status: 1 });
leadSchema.index({ whatsapp: 1 });

module.exports = mongoose.model('Lead', leadSchema);
