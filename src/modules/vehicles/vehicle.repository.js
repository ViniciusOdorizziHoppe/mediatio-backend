const Vehicle = require('./vehicle.model');
const Counter = require('../../shared/utils/counter.model');

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

  // Próximo número sequencial GLOBAL via counter atômico ($inc).
  // Elimina race conditions: duas requisições paralelas recebem
  // valores distintos garantidamente.
  // Na primeira chamada (counter inexistente) ou se solicitado
  // explicitamente (forceResync após colisão 11000), faz seed
  // olhando o maior codigo numérico existente.
  //
  // IMPORTANTE: o "maior codigo" é calculado via aggregation
  // extraindo a parte numérica e usando $max numérico — NUNCA por
  // sort({codigo:-1}) (lex), pois codigos legados com padding misto
  // (ex: "CARRO-2026-99" e "CARRO-2026-0500") quebram a ordenação
  // alfabética e levam a colisões persistentes.
  async _maxCodigoNum(prefix, year) {
    const pattern = new RegExp(`^${prefix}-${year}-`);
    const result = await Vehicle.aggregate([
      { $match: { codigo: { $regex: pattern } } },
      {
        $project: {
          num: {
            $convert: {
              input: {
                $arrayElemAt: [{ $split: ['$codigo', '-'] }, -1],
              },
              to: 'int',
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      { $group: { _id: null, max: { $max: '$num' } } },
    ]);
    return result[0]?.max || 0;
  }

  async nextCodigoNumber(tipo, forceResync = false) {
    const prefix = tipo === 'moto' ? 'MOTO' : 'CARRO';
    const year = new Date().getFullYear();
    const key = `vehicle:${prefix}:${year}`;

    // Resync forçado (após colisão): atualiza counter para max real + 1.
    if (forceResync) {
      const lastNum = await this._maxCodigoNum(prefix, year);
      const target = lastNum + 1;
      // $max só sobe; nunca desce. Garante atomicidade contra concorrência.
      await Counter.findOneAndUpdate(
        { key },
        { $max: { seq: target }, $setOnInsert: { key } },
        { upsert: true, new: true }
      );
      // Incremento atômico subsequente para reservar um número exclusivo.
      const after = await Counter.findOneAndUpdate(
        { key },
        { $inc: { seq: 1 } },
        { new: true }
      );
      return after.seq;
    }

    // Incremento atômico normal
    const counter = await Counter.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Primeira utilização do counter para esta chave: pode haver
    // veículos legados com codigos maiores. Faz seed via aggregation
    // (numérica) para tolerar dados pré-existentes.
    if (counter.seq === 1) {
      const lastNum = await this._maxCodigoNum(prefix, year);
      if (lastNum >= 1) {
        const seeded = await Counter.findOneAndUpdate(
          { key },
          { $set: { seq: lastNum + 1 } },
          { new: true }
        );
        return seeded.seq;
      }
    }

    return counter.seq;
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
