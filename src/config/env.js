/**
 * Validação de variáveis de ambiente com Zod
 * IMPORTANTE: ALLOWED_ORIGINS foi removido daqui.
 * As origens permitidas estão hardcoded no app.js para evitar
 * que um env var ausente cause crash e mascare o erro como CORS.
 */
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),

  // MongoDB — obrigatório
  MONGODB_URI: z.string().min(1, 'MONGODB_URI é obrigatória'),

  // JWT — obrigatório
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(20, 'JWT_REFRESH_SECRET obrigatório').optional(),

  // Bot auth (N8N) — opcional com padrão
  BOT_API_KEY: z.string().default('mediatio-bot-2026'),

  // Cloudinary — opcional (upload de fotos)
  CLOUDINARY_CLOUD_NAME: z.string().default('df9b2qd9x'),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Integrações opcionais
  MORPH_API_URL: z.string().url().optional(),
  MORPH_API_KEY: z.string().optional(),
  DIFY_BASE_URL: z.string().url().optional(),
  DIFY_API_KEY: z.string().optional(),
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE: z.string().optional(),
  GOOGLE_SHEET_ID: z.string().optional(),
});

let env;
try {
  env = envSchema.parse(process.env);
} catch (err) {
  console.error('\n❌ VARIÁVEIS DE AMBIENTE INVÁLIDAS:');
  err.errors?.forEach((e) => {
    console.error(`   ${e.path.join('.')} → ${e.message}`);
  });
  console.error('\n💡 Verifique as variáveis no Koyeb (Settings → Environment Variables)\n');
  process.exit(1);
}

module.exports = env;
