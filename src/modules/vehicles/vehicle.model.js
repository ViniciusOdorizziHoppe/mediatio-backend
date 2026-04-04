const mongoose = require('mongoose');

const fotoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    thumbnailUrl: String,
    publicId: { type: String, required: true }, // Cloudinary public_id
    formato: String,
    bytes: Number,
    largura: Number,
    altura: Number,
  },
  { _id: true }
);

const vehicleSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    tipo: {
      type: String,
      enum: ['moto', 'carro'],
      required: true,
      index: true,
    },

    marca: { type: String, required: true, index: true },
    modelo: { type: String, required: true, index: true },
    ano: { type: Number, required: true },
    cor: String,
    km: { type: Number, min: 0 },
    combustivel: {
      type: String,
      enum: ['gasolina', 'etanol', 'flex', 'diesel', 'elétrico'],
    },

    precos: {
      compra: { type: Number, min: 0 },
      venda: { type: Number, required: true, min: 0 },
      minimo: { type: Number, min: 0 },
      comissaoEstimada: { type: Number, min: 0 },
      fipeReferencia: Number,
      fipeMesReferencia: String,
    },

    condicoes: {
      aceitaTroca: { type: Boolean, default: false },
      aceitaFinanciamento: { type: Boolean, default: false },
      documentacao: {
        type: String,
        enum: ['ok', 'pendente', 'irregular'],
        default: 'ok',
      },
    },

    proprietario: {
      nome: String,
      whatsapp: String,
      cidade: String,
    },

    anuncio: {
      titulo: String,
      descricao: String,
      whatsappText: String,
      facebookText: String,
      instagramText: String,
      observacoes: String,
    },

    // Fotos no Cloudinary — pasta: mediatio/vehicles/{codigo}/
    fotos: {
      originais: { type: [fotoSchema], default: [] },
      melhoradas: { type: [fotoSchema], default: [] }, // Geradas pelo MORPH
      principal: String, // URL da foto principal (para cards)
      principalPublicId: String,
    },

    pipeline: {
      status: {
        type: String,
        enum: ['disponivel', 'contato_ativo', 'proposta', 'vendido', 'arquivado'],
        default: 'disponivel',
        index: true,
      },
      dataEntrada: { type: Date, default: Date.now },
      dataVenda: Date,
      diasNoPipeline: { type: Number, default: 0 },
    },

    leads: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],

    score: {
      valor: { type: Number, default: 0, min: 0, max: 100 },
      ultimoCalculo: Date,
      breakdown: [
        {
          criterio: String,
          pontos: Number,
          maximo: Number,
          atingido: Boolean,
          observacao: String,
        },
      ],
      label: { type: String, default: 'Sem avaliação' },
    },

    integracoes: {
      nexusKnowledgeId: String,
      googleSheetsRow: Number,
    },

    cadastradoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    atualizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices compostos para queries do dashboard
vehicleSchema.index({ 'pipeline.status': 1, 'score.valor': -1 });
vehicleSchema.index({ marca: 1, modelo: 1, ano: -1 });
vehicleSchema.index({ cadastradoPor: 1, createdAt: -1 });

// Virtual: lucro potencial
vehicleSchema.virtual('lucroPotencial').get(function () {
  if (!this.precos?.venda || !this.precos?.compra) return null;
  return this.precos.venda - this.precos.compra;
});

// Virtual: total de fotos
vehicleSchema.virtual('totalFotos').get(function () {
  return (this.fotos?.originais?.length || 0) + (this.fotos?.melhoradas?.length || 0);
});

// Pre-save: atualizar dias no pipeline e data de venda
vehicleSchema.pre('save', function (next) {
  if (
    this.isModified('pipeline.status') &&
    this.pipeline.status === 'vendido' &&
    !this.pipeline.dataVenda
  ) {
    this.pipeline.dataVenda = new Date();
  }

  const hoje = new Date();
  const entrada = this.pipeline.dataEntrada || hoje;
  this.pipeline.diasNoPipeline = Math.floor(
    (hoje - entrada) / (1000 * 60 * 60 * 24)
  );

  // Calcular comissão estimada automaticamente
  if (this.precos?.venda && this.precos?.compra) {
    this.precos.comissaoEstimada = this.precos.venda - this.precos.compra;
  }

  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
