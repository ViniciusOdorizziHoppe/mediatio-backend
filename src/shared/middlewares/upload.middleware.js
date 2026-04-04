/**
 * Upload Middleware — Multer + Cloudinary
 * Cloud: df9b2qd9x
 * Pasta: mediatio/vehicles/{vehicleId}/
 */

const multer = require('multer');
const { Readable } = require('stream');
const cloudinary = require('cloudinary').v2;
const logger = require('../../config/logger');

// Configurar Cloudinary com variáveis de ambiente
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'df9b2qd9x',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Multer: armazena em memória (sem disco — necessário para Koyeb/Render)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato não suportado. Use: JPG, PNG ou WebP'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * Faz upload de um buffer para o Cloudinary
 * @param {Buffer} buffer - arquivo em memória
 * @param {string} folder - pasta no Cloudinary
 * @param {string} publicId - ID público do arquivo
 * @returns {Promise<Object>} resultado do upload
 */
const uploadToCloudinary = (buffer, folder, publicId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error:', error);
          return reject(new Error('Falha no upload da imagem'));
        }
        resolve(result);
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Remove uma imagem do Cloudinary pelo publicId
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (err) {
    logger.error('Cloudinary delete error:', err);
    throw new Error('Falha ao remover imagem');
  }
};

/**
 * Gera URL de transformação para thumbnail
 */
const getThumbnailUrl = (publicId, width = 400) => {
  return cloudinary.url(publicId, {
    width,
    height: Math.round(width * 0.75),
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    fetch_format: 'auto',
  });
};

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  getThumbnailUrl,
  cloudinary,
};
