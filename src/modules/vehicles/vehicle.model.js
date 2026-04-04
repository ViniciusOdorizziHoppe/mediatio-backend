const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  codigo: { type: String, unique: true, index: true },
  tipo: { type: String, enum: ['moto', 'carro'], required: true },
  marca: { type: String, required: true },
  modelo: { type: String, required: true },
  ano: { type: Number, required: true },
  cor: String,
  km: Number,
  
  precos: {
    compra: Number,
    venda: { type: Number, required: true },
    minimo: Number,
    comissaoEstimada: Number,
    fipeReferencia: Number
  },
  
  condicoes: {
    aceitaTroca: { type: Boolean, default: false },
    aceitaFinanciamento: { type: Boolean, default: false },
    documentacao: { type: String, enum: ['ok', 'pendente', 'irregular'], default: 'ok' }
  },
  
  proprietario: {
    nome: String,
    whatsapp: String,
    cidade: String
  },
  
  anuncio: {
    titulo: String,
    descricao: String,
    observacoes: String
  },
  
  pipeline: {
    status: { 
      type: String, 
      enum: ['disponivel', 'contato_ativo', 'proposta', 'vendido', 'arquivado'],
      default: 'disponivel'
    },
    dataEntrada: { type: Date, default: Date.now },
    dataVenda: Date,
    diasNoPipeline: { type: Number, default: 0 }
  },
  
  cadastradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
}, { timestamps: true });

// Middleware para calcular dias no pipeline
vehicleSchema.pre('save', function(next) {
  if (this.pipeline.dataEntrada) {
    const hoje = new Date();
    this.pipeline.diasNoPipeline = Math.floor((hoje - this.pipeline.dataEntrada) / (1000 * 60 * 60 * 24));
  }
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema);