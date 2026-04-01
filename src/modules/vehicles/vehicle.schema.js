const { z } = require('zod');

const createVehicleSchema = z.object({
  tipo: z.enum(['moto', 'carro']),
  marca: z.string().min(2),
  modelo: z.string().min(2),
  ano: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  cor: z.string().optional(),
  km: z.number().min(0).optional(),
  precos: z.object({
    compra: z.number().min(0).optional(),
    venda: z.number().min(0),
    minimo: z.number().min(0).optional()
  }),
  condicoes: z.object({
    aceitaTroca: z.boolean().default(false),
    aceitaFinanciamento: z.boolean().default(false),
    documentacao: z.enum(['ok', 'pendente', 'irregular']).default('ok')
  }).optional(),
  proprietario: z.object({
    nome: z.string(),
    whatsapp: z.string(),
    cidade: z.string()
  }).optional()
});

const updateStatusSchema = z.object({
  status: z.enum(['disponivel', 'contato_ativo', 'proposta', 'vendido', 'arquivado'])
});

module.exports = {
  createVehicleSchema,
  updateStatusSchema
};