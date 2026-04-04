const { z } = require('zod');

const createVehicleSchema = z.object({
  tipo: z.enum(['moto', 'carro'], { message: "Tipo deve ser 'moto' ou 'carro'" }),
  marca: z.string().min(2, 'Marca obrigatória'),
  modelo: z.string().min(2, 'Modelo obrigatório'),
  ano: z
    .number({ invalid_type_error: 'Ano inválido' })
    .int()
    .min(1990)
    .max(new Date().getFullYear() + 1),
  cor: z.string().optional(),
  km: z.number().min(0).optional(),
  combustivel: z
    .enum(['gasolina', 'etanol', 'flex', 'diesel', 'elétrico'])
    .optional(),

  precos: z.object({
    compra: z.number().min(0).optional(),
    venda: z.number({ required_error: 'Preço de venda obrigatório' }).min(0),
    minimo: z.number().min(0).optional(),
  }),

  condicoes: z
    .object({
      aceitaTroca: z.boolean().default(false),
      aceitaFinanciamento: z.boolean().default(false),
      documentacao: z
        .enum(['ok', 'pendente', 'irregular'])
        .default('ok'),
    })
    .optional(),

  proprietario: z
    .object({
      nome: z.string().min(2),
      whatsapp: z.string().min(10),
      cidade: z.string().min(2),
    })
    .optional(),

  anuncio: z
    .object({
      observacoes: z.string().optional(),
    })
    .optional(),
});

const updateVehicleSchema = createVehicleSchema.partial();

const updateStatusSchema = z.object({
  status: z.enum(
    ['disponivel', 'contato_ativo', 'proposta', 'vendido', 'arquivado'],
    { message: 'Status inválido' }
  ),
});

const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Dados inválidos',
      details: err.errors?.map((e) => ({
        campo: e.path.join('.'),
        mensagem: e.message,
      })),
    });
  }
};

module.exports = {
  createVehicleSchema,
  updateVehicleSchema,
  updateStatusSchema,
  validate,
};
