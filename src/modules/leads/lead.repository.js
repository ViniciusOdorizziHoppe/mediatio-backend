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
    // Leads antigos podem ter o JID cru ("554792099658@s.whatsapp.net" ou "@lid").
    // O bot hoje normaliza antes de enviar (só dígitos + possível sufixo @lid).
    // Buscamos por igualdade e, se não achar, por "dígitos + qualquer sufixo @"
    // pra casar registros legados sem precisar fazer migração do banco.
    const base = String(whatsapp || '').split('@')[0];
    const query = {
      $or: [
        { whatsapp },
        { whatsapp: base },
        { whatsapp: { $regex: `^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@` } },
      ],
    };
    if (userId) query.criadoPor = userId;
    return Lead.findOne(query);
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
