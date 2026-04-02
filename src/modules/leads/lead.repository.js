// src/modules/leads/lead.repository.js
const Lead = require('./lead.model');

class LeadRepository {
  async findAll(filters = {}, options = {}) {
    const { page = 1, limit = 20, status, search } = filters;
    const query = {};
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { nome: new RegExp(search, 'i') },
        { whatsapp: new RegExp(search, 'i') }
      ];
    }
    
    const [data, total] = await Promise.all([
      Lead.find(query)
        .populate('interesse.vehicleId', 'marca modelo ano precoVenda')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean(),
      Lead.countDocuments(query)
    ]);
    
    return { data, meta: { total, page: parseInt(page), pages: Math.ceil(total / limit) } };
  }
  
  async findById(id) { return Lead.findById(id).populate('interesse.vehicleId').lean(); }
  async create(data) { return new Lead(data).save(); }
  async update(id, data) { return Lead.findByIdAndUpdate(id, data, { new: true }).lean(); }
  async updateStatus(id, status) { return this.update(id, { status, ultimoContato: new Date() }); }
}

module.exports = new LeadRepository();