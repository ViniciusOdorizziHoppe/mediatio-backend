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
  // explicitamente, faz seed olhando o maior codigo existente,
  // evitando colisão com dados legados.
  async nextCodigoNumber(tipo, forceResync = false) {
    const prefix = tipo === 'moto' ? 'MOTO' : 'CARRO';
    const year = new Date().getFullYear();
    const key = `vehicle:${prefix}:${year}`;

    // Se for resync forçado (após colisão), atualiza o counter para
    // ser maior que o maior codigo atualmente no banco.
    if (forceResync) {
      const pattern = new RegExp(`^${prefix}-${year}-`);
      const last = await Vehicle.findOne({ codigo: pattern })
        .sort({ codigo: -1 })
        .select('codigo')
        .lean();
      let lastNum = 0;
      if (last && last.codigo) {
        const match = String(last.codigo).match(/-(\d+)$/);
        lastNum = match ? parseInt(match[1], 10) : 0;
      }
      const target = lastNum + 1;
      const synced = await Counter.findOneAndUpdate(
        { key },
        { $max: { seq: target }, $setOnInsert: { key } },
        { upsert: true, new: true }
      );
      // Garante que retorna pelo menos o target após resync, com
      // incremento atômico subsequente.
      const after = await Counter.findOneAndUpdate(
        { key },
        { $inc: { seq: 1 } },
        { new: true }
      );
      return Math.max(after.seq, synced.seq, target);
    }

    // Incremento atômico normal
    const counter = await Counter.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Se acabou de ser criado (seq === 1), pode haver veículos
    // legados com codigos maiores. Faz seed olhando o maior existente
    // (independente do campo `tipo`, baseando-se apenas no prefixo do
    // codigo, para tolerar dados legados com tipo ausente/divergente).
    if (counter.seq === 1) {
      const pattern = new RegExp(`^${prefix}-${year}-`);
      const last = await Vehicle.findOne({ codigo: pattern })
        .sort({ codigo: -1 })
        .select('codigo')
        .lean();
      if (last && last.codigo) {
        const match = String(last.codigo).match(/-(\d+)$/);
        const lastNum = match ? parseInt(match[1], 10) : 0;
        if (lastNum >= counter.seq) {
          const seeded = await Counter.findOneAndUpdate(
            { key },
            { $set: { seq: lastNum + 1 } },
            { new: true }
          );
          return seeded.seq;
        }
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
