const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  MONGODB_URI: z.string().min(1, 'MongoDB URI é obrigatória'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32),
  
  // TORNAR OPCIONAIS (adicione .optional())
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  
  // Opcionais também
  DIFY_API_KEY: z.string().optional(),
  MORPH_API_URL: z.string().url().optional(),
  GOOGLE_SHEET_ID: z.string().optional(),
});

const env = envSchema.parse(process.env);

module.exports = env;