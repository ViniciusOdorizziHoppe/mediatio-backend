const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('8000'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI é obrigatória'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET deve ter pelo menos 32 caracteres'),
  // Cloudinary (opcional em dev)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  // Integrações opcionais
  DIFY_API_KEY: z.string().optional(),
  DIFY_API_URL: z.string().url().optional().default('https://api.dify.ai/v1'),
  MORPH_API_URL: z.string().url().optional(),
  GOOGLE_SHEET_ID: z.string().optional(),
  BOT_KEY: z.string().default('mediatio-bot-2026'),
});

let env;
try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Variáveis de ambiente inválidas:');
  error.errors.forEach(e => {
    console.error(`  - ${e.path.join('.')}: ${e.message}`);
  });
  process.exit(1);
}

module.exports = env;
