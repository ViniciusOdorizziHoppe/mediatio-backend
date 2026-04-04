const VehicleService = require('./vehicle.service');
const { success, paginated, error } = require('../../shared/utils/api-response');
const logger = require('../../config/logger');

class VehicleController {
  async list(req, res, next) {
    try {
      const { page, limit, status, tipo, search, minScore } = req.query;
      const result = await VehicleService.list(
        { status, tipo, search, minScore, cadastradoPor: req.query.all ? undefined : undefined },
        { page, limit }
      );
      res.json(paginated(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const vehicle = await VehicleService.getById(req.params.id);
      res.json(success(vehicle));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const vehicle = await VehicleService.create(req.body, req.user.id);
      res.status(201).json(success(vehicle, { message: 'Veículo cadastrado com sucesso' }));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const vehicle = await VehicleService.update(req.params.id, req.body, req.user.id);
      res.json(success(vehicle));
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const vehicle = await VehicleService.updateStatus(req.params.id, status, req.user.id);
      res.json(success(vehicle));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await VehicleService.delete(req.params.id);
      res.json(success(null, { message: 'Veículo arquivado' }));
    } catch (err) {
      next(err);
    }
  }

  async generateAd(req, res, next) {
    try {
      const ads = await VehicleService.generateAd(req.params.id);
      res.json(success(ads));
    } catch (err) {
      next(err);
    }
  }

  async recalculateScore(req, res, next) {
    try {
      const score = await VehicleService.recalculateScore(req.params.id);
      res.json(success(score));
    } catch (err) {
      next(err);
    }
  }

  // ── Fotos ──────────────────────────────────────────────────

  async uploadPhoto(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json(error('Nenhuma imagem enviada'));
      }

      const foto = await VehicleService.uploadPhoto(
        req.params.id,
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      res.status(201).json(success(foto, { message: 'Foto enviada com sucesso' }));
    } catch (err) {
      next(err);
    }
  }

  async deletePhoto(req, res, next) {
    try {
      const { photoId, publicId, tipo } = req.body;
      const vehicle = await VehicleService.deletePhoto(
        req.params.id,
        photoId,
        publicId,
        tipo || 'original'
      );
      res.json(success(vehicle, { message: 'Foto removida' }));
    } catch (err) {
      next(err);
    }
  }

  async setPrincipalPhoto(req, res, next) {
    try {
      const { url, publicId } = req.body;
      const vehicle = await VehicleService.setPrincipalPhoto(req.params.id, url, publicId);
      res.json(success(vehicle, { message: 'Foto principal definida' }));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VehicleController();
