const vehicleService = require('./vehicle.service');
const { createVehicleSchema, updateVehicleSchema, updateStatusSchema } = require('./vehicle.schema');
const { success, paginated } = require('../../shared/utils/api-response');
const logger = require('../../config/logger');

class VehicleController {
  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, status, tipo, search, minScore } = req.query;
      const filters = {};
      if (status) filters.status = status;
      if (tipo) filters.tipo = tipo;
      if (search) filters.search = search;
      if (minScore) filters.minScore = minScore;

      const userId = req.user?.id || process.env.BOT_USER_ID;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId nao identificado para esta requisicao' });
      }

      const result = await vehicleService.listVehicles(filters, { page, limit }, userId);
      res.json(paginated(result.data, result));
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const vehicle = await vehicleService.getVehicleById(req.params.id, req.user.id);
      res.json(success(vehicle));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = createVehicleSchema.parse(req.body);
      const vehicle = await vehicleService.createVehicle(data, req.user.id);
      res.status(201).json(success(vehicle));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = updateVehicleSchema.parse(req.body);
      const vehicle = await vehicleService.updateVehicle(req.params.id, data, req.user.id);
      res.json(success(vehicle));
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = updateStatusSchema.parse(req.body);
      const vehicle = await vehicleService.updateStatus(req.params.id, status, req.user.id);
      res.json(success(vehicle));
    } catch (err) {
      next(err);
    }
  }

  async updateStatusAsBot(req, res, next) {
    try {
      const { status } = updateStatusSchema.parse(req.body);
      const vehicle = await vehicleService.updateStatusAsBot(req.params.id, status);
      res.json(success(vehicle));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await vehicleService.deleteVehicle(req.params.id, req.user.id);
      res.json(success({ message: 'Veiculo removido com sucesso' }));
    } catch (err) {
      next(err);
    }
  }

  async generateAd(req, res, next) {
    try {
      const texts = await vehicleService.generateAdText(req.params.id, req.user.id);
      res.json(success(texts));
    } catch (err) {
      next(err);
    }
  }

  async recalculateScore(req, res, next) {
    try {
      const score = await vehicleService.recalculateScore(req.params.id, req.user.id);
      res.json(success(score));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/vehicles/:id/photos
   * Upload de fotos do veiculo (multipart: campo 'photos')
   */
  async uploadPhotos(req, res, next) {
    try {
      const vehicleRepository = require('./vehicle.repository');
      const ScoreCalculator = require('./vehicle.score');
      const { uploadToCloudinary } = require('../../shared/middlewares/upload.middleware');
      
      const vehicle = await vehicleService.getVehicleById(req.params.id, req.user.id);

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhuma foto enviada' });
      }

      const uploadedPhotos = [];
      for (const file of req.files) {
        const publicId = `mediatio/vehicles/${req.params.id}/${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const result = await uploadToCloudinary(file.buffer, `mediatio/vehicles/${req.params.id}`, publicId);
        uploadedPhotos.push({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          uploadedAt: new Date(),
        });
      }

      // Atualiza fotos no veiculo
      const fotosAtuais = vehicle.fotos?.originais || [];
      const novasFotos = [...fotosAtuais, ...uploadedPhotos];

      // Se for a primeira foto, define como principal
      const updateData = {
        fotos: {
          ...vehicle.fotos,
          originais: novasFotos,
          principal: vehicle.fotos?.principal || uploadedPhotos[0].url,
        },
      };

      await vehicleRepository.update(req.params.id, updateData);

      // Recalcula score (fotos afetam o score)
      const calculator = new ScoreCalculator({ ...vehicle.toObject(), ...updateData });
      const newScore = calculator.calcular();
      await vehicleRepository.update(req.params.id, { score: newScore });

      logger.info(`${uploadedPhotos.length} foto(s) uploaded para veiculo ${req.params.id}`);
      res.status(201).json(success({
        uploaded: uploadedPhotos,
        totalFotos: novasFotos.length,
        score: newScore,
      }));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VehicleController();
