const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  codigo: { 
    type: String, 
    unique: true, 
    required: true,
    index: true 
  },
  tipo: { 
    type: String, 
    enum: ['moto', 'carro'], 
    required: true,
    index: true 
  },
  marca: { type: String, required: true, index: true },
  modelo: { type: String, required: true, index: true },
  ano: { type: Number, required: true },
  cor: String,
  km: Number,
  combustivel: { type: String, enum: ['gasolina', 'etanol', 'flex', 'diesel'] },
  
  precos: {
    compra: Number,
    venda: { type: Number, required: true },
    minimo: Number,
    comissaoEstimada: Number,
    fipeReferencia: Number,
    fipeMesReferencia: String
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
    whatsappText: String,
    facebookText: String,
    instagramText: String,
    observacoes: String
  },
  
  fotos: {
    originais: [{ url: String, publicId: String, uploadedAt: Date }],
    melhoradas: [{ url: String, publicId: String, uploadedAt: Date }],
    principal: String // URL da foto principal para cards
  },
  
  pipeline: {
    status: { 
      type: String, 
      enum: ['disponivel', 'contato_ativo', 'proposta', 'vendido', 'arquivado'],
      default: 'disponivel',
      index: true 
    },
    dataEntrada: { type: Date, default: Date.now },
    dataVenda: Date,
    diasNoPipeline: { type: Number, default: 0 }
  },
  
  leads: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
  
  score: {
    valor: { type: Number, default: 0, min: 0, max: 100 },
    ultimoCalculo: Date,
    breakdown: [{
      criterio: String,
      pontos: Number,
      maximo: Number,
      atingido: Boolean
    }]
  },
  
  integracoes: {
    nexusKnowledgeId: String,
    googleSheetsRow: Number,
    cloudinaryFolder: String
  },
  
  cadastradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  atualizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compostos para queries frequentes
vehicleSchema.index({ 'pipeline.status': 1, 'score.valor': -1 });
vehicleSchema.index({ marca: 1, modelo: 1, ano: -1 });
vehicleSchema.index({ cadastradoPor: 1, createdAt: -1 });

// Virtual para lucro potencial
vehicleSchema.virtual('lucroPotencial').get(function() {
  return this.precos.venda - (this.precos.compra || 0);
});

// Middleware pre-save para calcular dias no pipeline
vehicleSchema.pre('save', function(next) {
  if (this.isModified('pipeline.status') && this.pipeline.status === 'vendido' && !this.pipeline.dataVenda) {
    this.pipeline.dataVenda = new Date();
  }
  
  const hoje = new Date();
  const entrada = this.pipeline.dataEntrada || hoje;
  this.pipeline.diasNoPipeline = Math.floor((hoje - entrada) / (1000 * 60 * 60 * 24));
  
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema);