/**
 * Upload Middleware — Multer + Cloudinary
 * Cloud: df9b2qd9x
 * Pasta: mediatio/vehicles/{vehicleId}/
 * 
 * Se cloudinary/multer nao estiverem instalados, retorna stubs
 * que nao quebram a aplicacao.
 */

const logger = require('../../config/logger');

let multer, cloudinary, Readable;
let available = false;

try {
  multer = require('multer');
  Readable = require('stream').Readable;
  try {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'df9b2qd9x',
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    available = true;
    logger.info('Cloudinary + Multer configurados');
  } catch (e) {
    logger.warn('Cloudinary nao disponivel — upload de fotos desabilitado:', e.message);
  }
} catch (e) {
  logger.warn('Multer nao disponivel — upload de fotos desabilitado:', e.message);
}

// ── Stubs quando nao disponivel ──────────────────────────────
const noUpload = (req, res, next) => {
  res.status(501).json({ success: false, error: 'Upload de fotos nao configurado (cloudinary/multer ausente)' });
};

const upload = available
  ? multer({ storage: multer.memoryStorage(), fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      cb(null, allowed.includes(file.mimetype));
    }, limits: { fileSize: 10 * 1024 * 1024 } })
  : { array: () => noUpload, single: () => noUpload, any: () => noUpload };

const uploadToCloudinary = available
  ? (buffer, folder, publicId) => new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
        folder, public_id: publicId, resource_type: 'image',
        transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }],
        overwrite: true,
      }, (error, result) => {
        if (error) { logger.error('Cloudinary upload error:', error); return reject(new Error('Falha no upload da imagem')); }
        resolve(result);
      });
      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    })
  : async () => { throw new Error('Cloudinary nao configurado'); };

const deleteFromCloudinary = available
  ? async (publicId) => { try { return await cloudinary.uploader.destroy(publicId); } catch (err) { logger.error('Cloudinary delete error:', err); throw new Error('Falha ao remover imagem'); } }
  : async () => { throw new Error('Cloudinary nao configurado'); };

const getThumbnailUrl = available
  ? (publicId, width = 400) => cloudinary.url(publicId, { width, height: Math.round(width * 0.75), crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' })
  : () => '';

module.exports = { upload, uploadToCloudinary, deleteFromCloudinary, getThumbnailUrl, cloudinary: cloudinary || null, available };
