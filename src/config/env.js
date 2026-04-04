const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('8000'),
  MONGODB_URI: z.string().min(1, 'MongoDB URI é obrigatória'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  FRONTEND_URL: z.string().optional(),
});

const env = envSchema.parse(process.env);

module.exports = env;