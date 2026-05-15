const Vehicle = require('./vehicle.model');
const logger = require('../../config/logger');

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

  // Maior número numérico de codigo já existente para um prefix+year.
  // Estratégia: busca TODOS os codigos matching e faz parse numérico
  // em JavaScript. Garante correção independente de padding misto,
  // sintaxe de aggregation ou versão do driver. Dataset por
  // (prefix, year) é pequeno (centenas/poucos milhares por ano),
  // então a query é rápida.
  async _maxCodigoNum(prefix, year) {
    const pattern = new RegExp(`^${prefix}-${year}-`);
    const docs = await Vehicle.find({ codigo: pattern })
      .select('codigo -_id')
      .lean();
    let max = 0;
    for (const d of docs) {
      if (!d || !d.codigo) continue;
      const m = String(d.codigo).match(/-(\d+)$/);
      if (!m) continue;
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return max;
  }

  // Próximo número sequencial para codigo de veículo.
  // Estratégia simples e robusta: busca o maior codigo numérico real
  // do banco (find().lean() + parse JS) e retorna max + 1 + offset.
  // O offset (default 0) é incrementado no service em cada retry após
  // colisão, garantindo que mesmo sob concorrência ou estado corrompido
  // de algum counter persistido, sempre haja convergência.
  // Não depende de coleção Counter — evita problemas de estado.
  async nextCodigoNumber(tipo, offset = 0) {
    const prefix = tipo === 'moto' ? 'MOTO' : 'CARRO';
    const year = new Date().getFullYear();
    const lastNum = await this._maxCodigoNum(prefix, year);
    const next = lastNum + 1 + offset;
    logger.info(`[codigo] tipo=${tipo} dbMax=${lastNum} offset=${offset} returned=${next}`);
    return next;
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
    if (filters.origem) query.origem = filters.origem;
    return query;
  }
}

module.exports = new VehicleRepository();
