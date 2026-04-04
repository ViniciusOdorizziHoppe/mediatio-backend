const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),

  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // MongoDB — obrigatório
  MONGODB_URI: z.string().min(1, 'MONGODB_URI é obrigatória'),

  // JWT — obrigatório, mínimo 32 chars
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET deve ter pelo menos 32 caracteres').optional(),

  // Cloudinary — necessário para upload de fotos
  CLOUDINARY_CLOUD_NAME: z.string().default('df9b2qd9x'),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Integrações opcionais
  MORPH_API_URL: z.string().url().optional(),
  MORPH_API_KEY: z.string().optional(),
  DIFY_BASE_URL: z.string().url().optional(),
  DIFY_API_KEY: z.string().optional(),
  DIFY_KNOWLEDGE_ID: z.string().optional(),
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE: z.string().optional(),
  GOOGLE_SHEET_ID: z.string().optional(),
});

let env;
try {
  env = envSchema.parse(process.env);
} catch (err) {
  console.error('❌ Variáveis de ambiente inválidas:');
  err.errors?.forEach((e) => {
    console.error(`   ${e.path.join('.')}: ${e.message}`);
  });
  process.exit(1);
}

module.exports = env;
