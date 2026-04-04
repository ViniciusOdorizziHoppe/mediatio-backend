const express = require('express');
const router = express.Router();
const controller = require('./vehicle.controller');
const auth = require('../../shared/middlewares/auth.middleware');
const { upload } = require('../../shared/middlewares/upload.middleware');
const { validate, createVehicleSchema, updateStatusSchema } = require('./vehicle.schema');

// Todas as rotas exigem autenticação
router.use(auth);

// ── CRUD ──────────────────────────────────────────────────────
router.get('/', controller.list.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', validate(createVehicleSchema), controller.create.bind(controller));
router.patch('/:id', controller.update.bind(controller));
router.patch('/:id/status', validate(updateStatusSchema), controller.updateStatus.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

// ── Ações ─────────────────────────────────────────────────────
router.post('/:id/generate-ad', controller.generateAd.bind(controller));
router.post('/:id/recalculate-score', controller.recalculateScore.bind(controller));

// ── Fotos (Cloudinary) ────────────────────────────────────────
// POST /api/vehicles/:id/photos — upload de uma foto (multipart/form-data, campo: "foto")
router.post('/:id/photos', upload.single('foto'), controller.uploadPhoto.bind(controller));

// DELETE /api/vehicles/:id/photos — remove uma foto
// Body: { photoId, publicId, tipo }
router.delete('/:id/photos', controller.deletePhoto.bind(controller));

// PATCH /api/vehicles/:id/photos/principal — define foto principal
// Body: { url, publicId }
router.patch('/:id/photos/principal', controller.setPrincipalPhoto.bind(controller));

module.exports = router;
