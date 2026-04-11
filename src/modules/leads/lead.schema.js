const { z } = require('zod');

const createLeadSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').default('Cliente WhatsApp'),
  whatsapp: z.string().min(8, 'WhatsApp inválido'),
  canal: z.enum(['whatsapp', 'facebook', 'olx', 'site', 'indicacao', 'outro']).default('whatsapp'),
  status: z.enum(['novo', 'contatado', 'interessado', 'proposta_enviada', 'fechado', 'perdido']).default('novo'),
  cidade: z.string().optional(),
  orcamento: z.number().optional(),
  interesse: z.union([
    z.string(),
    z.object({
      vehicleId: z.string().optional(),
      descricao: z.string().optional(),
      canal: z.string().optional(),
    })
  ]).optional().transform(val => {
    if (typeof val === 'string') return { descricao: val };
    return val;
  }),
  notas: z.string().optional(),
  userId: z.string().optional(),
});

const updateLeadSchema = z.object({
  nome: z.string().min(1).optional(),
  whatsapp: z.string().min(8).optional(),
  canal: z.enum(['whatsapp', 'facebook', 'olx', 'site', 'indicacao', 'outro']).optional(),
  status: z.enum(['novo', 'contatado', 'interessado', 'proposta_enviada', 'fechado', 'perdido']).optional(),
  cidade: z.string().optional(),
  orcamento: z.number().optional(),
  interesse: z.union([
    z.string(),
    z.object({
      vehicleId: z.string().optional(),
      descricao: z.string().optional(),
    })
  ]).optional().transform(val => {
    if (typeof val === 'string') return { descricao: val };
    return val;
  }),
  notas: z.string().optional(),
});

module.exports = { createLeadSchema, updateLeadSchema };
