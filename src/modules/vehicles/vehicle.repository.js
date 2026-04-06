const Vehicle = require('./vehicle.model');

class VehicleRepository {
  async findAll(filters = {}, options = {}) {
    const { page = 1, limit = 20, sort = '-createdAt' } = options;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = this.buildQuery(filters);

    const [data, total] = await Promise.all([
      Vehicle.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('cadastradoPor', 'name email'),
      Vehicle.countDocuments(query),
    ]);

    return { data, total, page: parseInt(page), limit: parseInt(limit) };
  }

  async findById(id) {
    return Vehicle.findById(id)
      .populate('cadastradoPor', 'name email')
      .populate('leads');
  }

  async findByUserId(userId, filters = {}, options = {}) {
    return this.findAll({ ...filters, cadastradoPor: userId }, options);
  }

  async create(data) {
    return Vehicle.create(data);
  }

  async update(id, data) {
    return Vehicle.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async updateStatus(id, status) {
    const update = { 'pipeline.status': status };
    if (status === 'vendido') update['pipeline.dataVenda'] = new Date();
    return Vehicle.findByIdAndUpdate(id, { $set: update }, { new: true });
  }

  async delete(id) {
    return Vehicle.findByIdAndDelete(id);
  }

  async countDocuments(filter = {}) {
    return Vehicle.countDocuments(filter);
  }

  async getAnalytics(userId) {
    const match = userId ? { cadastradoPor: userId } : {};
    return Vehicle.aggregate([
      { $match: match },
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

  buildQuery(filters) {
    const query = {};
    if (filters.cadastradoPor) query.cadastradoPor = filters.cadastradoPor;
    if (filters.status) query['pipeline.status'] = filters.status;
    if (filters.tipo) query.tipo = filters.tipo;
    if (filters.search) {
      query.$or = [
        { modelo: new RegExp(filters.search, 'i') },
        { marca: new RegExp(filters.search, 'i') },
        { codigo: new RegExp(filters.search, 'i') },
      ];
    }
    if (filters.minScore) query['score.valor'] = { $gte: parseInt(filters.minScore) };
    return query;
  }
}

module.exports = new VehicleRepository();
