const vehicleService = require('./vehicle.service');
const { createVehicleSchema, updateVehicleSchema, updateStatusSchema } = require('./vehicle.schema');
const { success, paginated } = require('../../shared/utils/api-response');

class VehicleController {
  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, status, tipo, search, minScore } = req.query;
      const filters = {};
      if (status) filters.status = status;
      if (tipo) filters.tipo = tipo;
      if (search) filters.search = search;
      if (minScore) filters.minScore = minScore;

      // Se for bot, usa o BOT_USER_ID ou o primeiro admin encontrado
      const userId = req.user?.id || process.env.BOT_USER_ID;
      
      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId não identificado para esta requisição' });
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

  async delete(req, res, next) {
    try {
      await vehicleService.deleteVehicle(req.params.id, req.user.id);
      res.json(success({ message: 'Veículo removido com sucesso' }));
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
}

module.exports = new VehicleController();
