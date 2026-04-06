const Lead = require('./lead.model');

class LeadRepository {
  async findAll(filters = {}, options = {}) {
    const { page = 1, limit = 20, sort = '-createdAt' } = options;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = this.buildQuery(filters);

    const [data, total] = await Promise.all([
      Lead.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('interesse.vehicleId', 'codigo marca modelo ano'),
      Lead.countDocuments(query),
    ]);

    return { data, total, page: parseInt(page), limit: parseInt(limit) };
  }

  async findById(id) {
    return Lead.findById(id).populate('interesse.vehicleId', 'codigo marca modelo ano');
  }

  async findByWhatsapp(whatsapp, userId) {
    return Lead.findOne({ whatsapp, criadoPor: userId });
  }

  async create(data) {
    return Lead.create(data);
  }

  async update(id, data) {
    return Lead.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async delete(id) {
    return Lead.findByIdAndDelete(id);
  }

  buildQuery(filters) {
    const query = {};
    if (filters.criadoPor) query.criadoPor = filters.criadoPor;
    if (filters.status) query.status = filters.status;
    if (filters.canal) query.canal = filters.canal;
    if (filters.search) {
      query.$or = [
        { nome: new RegExp(filters.search, 'i') },
        { whatsapp: new RegExp(filters.search, 'i') },
      ];
    }
    return query;
  }
}

module.exports = new LeadRepository();
