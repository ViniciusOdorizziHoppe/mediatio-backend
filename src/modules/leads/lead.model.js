const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true },
    whatsapp: { type: String, required: true, index: true },

    interesse: {
      descricao: String,
      vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    },

    canal: {
      type: String,
      enum: ['whatsapp', 'facebook', 'olx', 'instagram', 'site', 'indicacao', 'outro'],
      default: 'whatsapp',
    },

    status: {
      type: String,
      enum: ['novo', 'contatado', 'interessado', 'proposta_enviada', 'fechado', 'perdido'],
      default: 'novo',
      index: true,
    },

    orcamento: Number, // Quanto o comprador pode pagar
    cidade: String,
    notas: String,

    ultimoContato: { type: Date, default: Date.now },
    criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

leadSchema.index({ criadoPor: 1, status: 1 });
leadSchema.index({ 'interesse.vehicleId': 1 });

module.exports = mongoose.model('Lead', leadSchema);
