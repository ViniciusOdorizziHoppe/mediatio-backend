// src/modules/leads/lead.service.js
const LeadRepository = require('./lead.repository');
const logger = require('../../config/logger');

class LeadService {
  async listLeads(filters, options) { return LeadRepository.findAll(filters, options); }
  async getLeadById(id) { return LeadRepository.findById(id); }
  
  async createLead(data, userId) {
    const lead = await LeadRepository.create({ ...data, criadoPor: userId });
    logger.info(`Lead criado: ${lead.nome} (${lead.whatsapp})`);
    return lead;
  }
  
  async updateLead(id, data, userId) {
    logger.info(`Lead atualizado: ${id} por ${userId}`);
    return LeadRepository.update(id, data);
  }
  
  async updateStatus(id, status) { return LeadRepository.updateStatus(id, status); }
}

module.exports = new LeadService();