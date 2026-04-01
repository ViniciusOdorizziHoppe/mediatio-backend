const Vehicle = require('./vehicle.model');
const logger = require('../../config/logger');

class VehicleRepository {
  async findAll(filters = {}, options = {}) {
    const { page = 1, limit = 20, sort = { 'score.valor': -1 } } = options;
    
    const query = this.buildQuery(filters);
    
    const [data, total] = await Promise.all([
      Vehicle.find(query)
        .populate('cadastradoPor', 'name email')
        .populate('leads', 'name status')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean(), // Performance: retorna POJO ao invés de mongoose document
      Vehicle.countDocuments(query)
    ]);
    
    return {
      data,
      meta: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async findById(id) {
    return Vehicle.findById(id)
      .populate('cadastradoPor', 'name email phone')
      .populate('leads')
      .lean();
  }
  
  async create(vehicleData) {
    const vehicle = new Vehicle(vehicleData);
    await vehicle.save();
    return vehicle.toObject();
  }
  
  async update(id, updateData) {
    return Vehicle.findByIdAndUpdate(
      id, 
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).lean();
  }
  
  async updateStatus(id, status) {
    return Vehicle.findByIdAndUpdate(
      id,
      { 'pipeline.status': status, updatedAt: new Date() },
      { new: true }
    ).lean();
  }
  
  async delete(id) {
    // Soft delete: apenas marca como arquivado
    return this.updateStatus(id, 'arquivado');
  }
  
  async addPhoto(id, photoData, tipo = 'original') {
    const updatePath = tipo === 'melhorada' 
      ? 'fotos.melhoradas' 
      : 'fotos.originais';
      
    return Vehicle.findByIdAndUpdate(
      id,
      { $push: { [updatePath]: photoData } },
      { new: true }
    ).lean();
  }
  
  buildQuery(filters) {
    const query = {};
    
    if (filters.status) query['pipeline.status'] = filters.status;
    if (filters.tipo) query.tipo = filters.tipo;
    if (filters.marca) query.marca = new RegExp(filters.marca, 'i');
    if (filters.search) {
      query.$or = [
        { modelo: new RegExp(filters.search, 'i') },
        { marca: new RegExp(filters.search, 'i') },
        { codigo: new RegExp(filters.search, 'i') }
      ];
    }
    if (filters.minScore) query['score.valor'] = { $gte: parseInt(filters.minScore) };
    
    return query;
  }
  
  async getAnalytics(cadastradoPor) {
    const match = cadastradoPor ? { cadastradoPor } : {};
    
    return Vehicle.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$pipeline.status',
          count: { $sum: 1 },
          valorTotal: { $sum: '$precos.venda' },
          comissaoTotal: { $sum: '$precos.comissaoEstimada' }
        }
      }
    ]);
  }
}

module.exports = new VehicleRepository();