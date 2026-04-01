const vehicleService = require('./vehicle.service');
const { success, error: errorResponse } = require('../../shared/utils/api-response');
const logger = require('../../config/logger');

class VehicleController {
  async list(req, res, next) {
    try {
      const { page, limit, status, tipo, search, minScore } = req.query;
      const filters = { status, tipo, search, minScore };
      const options = { page, limit };
      
      const result = await vehicleService.listVehicles(filters, options);
      res.json(success(result.data, { meta: result.meta }));
    } catch (err) {
      next(err);
    }
  }
  
  async getById(req, res, next) {
    try {
      const vehicle = await vehicleService.getVehicleById(req.params.id);
      res.json(success(vehicle));
    } catch (err) {
      next(err);
    }
  }
  
  async create(req, res, next) {
    try {
      const vehicle = await vehicleService.createVehicle(req.body, req.user.id);
      res.status(201).json(success(vehicle, { message: 'Veículo cadastrado com sucesso' }));
    } catch (err) {
      logger.error('Create vehicle error:', err);
      next(err);
    }
  }
  
  async update(req, res, next) {
    try {
      const vehicle = await vehicleService.updateVehicle(
        req.params.id, 
        req.body, 
        req.user.id
      );
      res.json(success(vehicle));
    } catch (err) {
      next(err);
    }
  }
  
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const vehicle = await vehicleService.updateStatus(
        req.params.id, 
        status, 
        req.user.id
      );
      res.json(success(vehicle));
    } catch (err) {
      next(err);
    }
  }
  
  async generateAd(req, res, next) {
    try {
      const ads = await vehicleService.generateAdText(req.params.id);
      res.json(success(ads));
    } catch (err) {
      next(err);
    }
  }
  
  async recalculateScore(req, res, next) {
    try {
      const score = await vehicleService.recalculateScore(req.params.id);
      res.json(success(score));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VehicleController();