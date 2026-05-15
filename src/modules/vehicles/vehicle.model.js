const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      unique: true,
      index: true,
    },
    tipo: {
      type: String,
      enum: ['moto', 'carro'],
      required: [true, 'Tipo é obrigatório'],
    },
    marca: {
      type: String,
      required: [true, 'Marca é obrigatória'],
      trim: true,
    },
    modelo: {
      type: String,
      required: [true, 'Modelo é obrigatório'],
      trim: true,
    },
    ano: {
      type: Number,
      required: [true, 'Ano é obrigatório'],
      min: [1950, 'Ano inválido'],
      max: [new Date().getFullYear() + 1, 'Ano inválido'],
    },
    cor: {
      type: String,
      trim: true,
    },
    km: {
      type: Number,
      min: [0, 'KM não pode ser negativo'],
    },
    precos: {
      compra: Number,
      venda: {
        type: Number,
        required: [true, 'Preço de venda é obrigatório'],
        min: [0, 'Preço não pode ser negativo'],
      },
      minimo: Number,
      comissaoEstimada: Number,
      fipeReferencia: Number,
      fipeMesReferencia: String,
    },
    condicoes: {
      aceitaTroca: { type: Boolean, default: false },
      aceitaFinanciamento: { type: Boolean, default: false },
      documentacao: {
        type: String,
        enum: ['ok', 'pendente', 'irregular'],
        default: 'pendente',
      },
    },
    proprietario: {
      nome: String,
      whatsapp: String,
      cidade: String,
    },
    anuncio: {
      observacoes: String,
      textoWhatsapp: String,
      textoFacebook: String,
      url: String,
      cliques: { type: Number, default: 0 },
    },
    fotos: {
      principal: String,
      originais: [{ url: String, publicId: String }],
      melhoradas: [{ url: String, publicId: String }],
    },
    pipeline: {
      status: {
        type: String,
        enum: ['disponivel', 'contato_ativo', 'proposta', 'vendido', 'arquivado'],
        default: 'disponivel',
      },
      dataEntrada: { type: Date, default: Date.now },
      dataVenda: Date,
      diasNoPipeline: { type: Number, default: 0 },
    },
    score: {
      valor: { type: Number, default: 0, min: 0, max: 100 },
      label: String,
      breakdown: [mongoose.Schema.Types.Mixed],
      ultimoCalculo: Date,
    },
    leads: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
    // Origem do veiculo
    origem: {
      type: String,
      enum: ['particular', 'concessionaria'],
      default: 'particular',
      index: true,
    },
    // Dados da concessionaria (se origem = concessionaria)
    concessionaria: {
      nome: String,
      contato: String,
      whatsapp: String,
      cidade: String,
      comissaoPadrao: Number,    // % da margem, ex: 30 = 30%
      dataParceria: Date,
    },
    cadastradoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    atualizadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Virtual: comissão calculada
vehicleSchema.virtual('comissao').get(function () {
  if (this.precos?.venda && this.precos?.compra) {
    return this.precos.venda - this.precos.compra;
  }
  return this.precos?.comissaoEstimada || 0;
});

// Índices para performance
vehicleSchema.index({ cadastradoPor: 1, 'pipeline.status': 1 });
vehicleSchema.index({ marca: 'text', modelo: 'text', codigo: 'text' });

module.exports = mongoose.model('Vehicle', vehicleSchema);
