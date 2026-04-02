const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
});

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  whatsapp: z.string().optional(),
  role: z.enum(['admin', 'socio', 'colaborador']).optional()
});

module.exports = {
  loginSchema,
  registerSchema
};