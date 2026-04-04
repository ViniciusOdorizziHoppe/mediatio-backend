const Vehicle = require('./vehicle.model');
const logger = require('../../config/logger');

class VehicleRepository {
  _buildQuery(filters = {}) {
    const query = {};
    if (filters.status) query['pipeline.status'] = filters.status;
    if (filters.tipo) query.tipo = filters.tipo;
    if (filters.marca) query.marca = new RegExp(filters.marca, 'i');
    if (filters.cadastradoPor) query.cadastradoPor = filters.cadastradoPor;
    if (filters.minScore) query['score.valor'] = { $gte: parseInt(filters.minScore) };
    if (filters.search) {
      query.$or = [
        { modelo: new RegExp(filters.search, 'i') },
        { marca: new RegExp(filters.search, 'i') },
        { codigo: new RegExp(filters.search, 'i') },
        { 'proprietario.nome': new RegExp(filters.search, 'i') },
      ];
    }
    return query;
  }

  async findAll(filters = {}, options = {}) {
    const { page = 1, limit = 20, sort = { 'score.valor': -1, createdAt: -1 } } = options;
    const query = this._buildQuery(filters);

    const [data, total] = await Promise.all([
      Vehicle.find(query)
        .populate('cadastradoPor', 'name email')
        .sort(sort)
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .lean(),
      Vehicle.countDocuments(query),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    };
  }

  async findById(id) {
    return Vehicle.findById(id)
      .populate('cadastradoPor', 'name email phone')
      .populate('leads')
      .lean();
  }

  async countDocuments(filters = {}) {
    return Vehicle.countDocuments(this._buildQuery(filters));
  }

  async create(data) {
    const vehicle = new Vehicle(data);
    await vehicle.save();
    return vehicle.toObject();
  }

  async update(id, data) {
    return Vehicle.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
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

  async updateScore(id, score) {
    return Vehicle.findByIdAndUpdate(
      id,
      { score, updatedAt: new Date() },
      { new: true }
    ).lean();
  }

  async addPhoto(id, photoData, tipo = 'original') {
    const field = tipo === 'melhorada' ? 'fotos.melhoradas' : 'fotos.originais';
    return Vehicle.findByIdAndUpdate(
      id,
      { $push: { [field]: photoData } },
      { new: true }
    ).lean();
  }

  async removePhoto(id, photoId, tipo = 'original') {
    const field = tipo === 'melhorada' ? 'fotos.melhoradas' : 'fotos.originais';
    return Vehicle.findByIdAndUpdate(
      id,
      { $pull: { [field]: { _id: photoId } } },
      { new: true }
    ).lean();
  }

  async setPrincipalPhoto(id, url, publicId) {
    return Vehicle.findByIdAndUpdate(
      id,
      {
        'fotos.principal': url,
        'fotos.principalPublicId': publicId,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();
  }

  // Soft delete → arquivar
  async delete(id) {
    return this.updateStatus(id, 'arquivado');
  }

  async getAnalyticsByUser(userId) {
    return Vehicle.aggregate([
      { $match: { cadastradoPor: userId } },
      {
        $group: {
          _id: '$pipeline.status',
          count: { $sum: 1 },
          valorTotal: { $sum: '$precos.venda' },
          comissaoTotal: { $sum: '$precos.comissaoEstimada' },
        },
      },
    ]);
  }

  async getVendasUltimosMeses(userId, meses = 6) {
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - meses);

    return Vehicle.aggregate([
      {
        $match: {
          cadastradoPor: userId,
          'pipeline.status': 'vendido',
          'pipeline.dataVenda': { $gte: dataInicio },
        },
      },
      {
        $group: {
          _id: {
            ano: { $year: '$pipeline.dataVenda' },
            mes: { $month: '$pipeline.dataVenda' },
          },
          vendas: { $sum: 1 },
          comissao: { $sum: '$precos.comissaoEstimada' },
        },
      },
      { $sort: { '_id.ano': 1, '_id.mes': 1 } },
    ]);
  }
}

module.exports = new VehicleRepository();
