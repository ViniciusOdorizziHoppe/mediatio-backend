const { z } = require('zod');

const createVehicleSchema = z.object({
  tipo: z.enum(['moto', 'carro'], { required_error: 'Tipo é obrigatório' }),
  marca: z.string().min(1, 'Marca é obrigatória').max(100),
  modelo: z.string().min(1, 'Modelo é obrigatório').max(100),
  ano: z.number().int().min(1950).max(new Date().getFullYear() + 1),
  cor: z.string().max(50).optional(),
  km: z.number().min(0).optional(),
  precos: z.object({
    compra: z.number().min(0).optional(),
    venda: z.number().min(0, 'Preço de venda é obrigatório'),
    minimo: z.number().min(0).optional(),
    comissaoEstimada: z.number().min(0).optional(),
  }),
  condicoes: z.object({
    aceitaTroca: z.boolean().default(false),
    aceitaFinanciamento: z.boolean().default(false),
    documentacao: z.enum(['ok', 'pendente', 'irregular']).default('pendente'),
  }).optional(),
  proprietario: z.object({
    nome: z.string().optional(),
    whatsapp: z.string().optional(),
    cidade: z.string().optional(),
  }).optional(),
  anuncio: z.object({
    observacoes: z.string().optional(),
  }).optional(),
  fotos: z.object({
    principal: z.string().optional(),
    originais: z.array(z.object({
      url: z.string(),
      publicId: z.string().optional().default(''),
    })).optional(),
    melhoradas: z.array(z.object({
      url: z.string(),
      publicId: z.string().optional().default(''),
    })).optional(),
  }).optional(),
});

const updateVehicleSchema = createVehicleSchema.partial();

const updateStatusSchema = z.object({
  status: z.enum(['disponivel', 'contato_ativo', 'proposta', 'vendido', 'arquivado']),
});

module.exports = { createVehicleSchema, updateVehicleSchema, updateStatusSchema };
