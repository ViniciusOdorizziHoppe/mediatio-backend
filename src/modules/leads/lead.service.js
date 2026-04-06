const leadRepository = require('./lead.repository');
const logger = require('../../config/logger');

class LeadService {
  async listLeads(filters, options, userId) {
    return leadRepository.findAll({ ...filters, criadoPor: userId }, options);
  }

  async getLeadById(id, userId) {
    const lead = await leadRepository.findById(id);
    if (!lead) {
      const err = new Error('Lead não encontrado');
      err.statusCode = 404;
      throw err;
    }
    if (lead.criadoPor?.toString() !== userId) {
      const err = new Error('Acesso negado');
      err.statusCode = 403;
      throw err;
    }
    return lead;
  }

  async createLead(data, userId) {
    const lead = await leadRepository.create({ ...data, criadoPor: userId });
    logger.info(`Lead criado: ${lead.nome} (${lead.whatsapp}) por ${userId}`);
    return lead;
  }

  /**
   * Cria ou atualiza lead pelo WhatsApp (usado pelo bot N8N)
   */
  async upsertLeadByWhatsapp(data, userId) {
    const existing = await leadRepository.findByWhatsapp(data.whatsapp, userId);
    if (existing) {
      const updated = await leadRepository.update(existing._id, {
        ...data,
        ultimoContato: new Date(),
      });
      return { lead: updated, created: false };
    }
    const lead = await this.createLead(data, userId);
    return { lead, created: true };
  }

  async updateLead(id, data, userId) {
    await this.getLeadById(id, userId);
    return leadRepository.update(id, { ...data, ultimoContato: new Date() });
  }

  async deleteLead(id, userId) {
    await this.getLeadById(id, userId);
    return leadRepository.delete(id);
  }
}

module.exports = new LeadService();
