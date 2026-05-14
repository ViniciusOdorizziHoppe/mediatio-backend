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
    const LeadModel = require('./lead.model');
    // Normaliza o whatsapp no write: tira qualquer sufixo "@..." — assim leads
    // legados ficam consistentes com o formato que o bot envia hoje (só dígitos).
    const normalizedWhatsapp = String(data.whatsapp || '').split('@')[0];
    const payload = { ...data, whatsapp: normalizedWhatsapp };

    const existing = await leadRepository.findByWhatsapp(normalizedWhatsapp, userId);

    if (existing) {
      const { historicoMensagens, ...otherData } = payload;

      let updated;
      if (historicoMensagens && historicoMensagens.length > 0) {
        // Se houver novas mensagens, faz o append no array existente
        updated = await LeadModel.findByIdAndUpdate(
          existing._id,
          {
            $set: { ...otherData, ultimoContato: new Date() },
            $push: { historicoMensagens: { $each: historicoMensagens } }
          },
          { new: true }
        );
      } else {
        updated = await leadRepository.update(existing._id, {
          ...otherData,
          ultimoContato: new Date(),
        });
      }

      return { lead: updated, created: false };
    }

    const lead = await this.createLead(payload, userId);
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

  /**
   * Vincula um lead a um veiculo especifico
   */
  async assignToVehicle(leadId, vehicleId, userId) {
    await this.getLeadById(leadId, userId);
    const Vehicle = require('../vehicles/vehicle.model');

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      const err = new Error('Veiculo nao encontrado');
      err.statusCode = 404;
      throw err;
    }

    // Atualiza o lead com o vehicleId
    const updatedLead = await leadRepository.update(leadId, {
      'interesse.vehicleId': vehicleId,
      ultimoContato: new Date(),
    });

    // Adiciona o lead ao array de leads do veiculo (se nao estiver la)
    if (!vehicle.leads.includes(leadId)) {
      vehicle.leads.push(leadId);
      await vehicle.save();
    }

    // Recalcula score do veiculo (leads afetam o score)
    const ScoreCalculator = require('../vehicles/vehicle.score');
    const calculator = new ScoreCalculator(vehicle);
    const newScore = calculator.calcular();
    await Vehicle.findByIdAndUpdate(vehicleId, { score: newScore });

    logger.info(`Lead ${leadId} vinculado ao veiculo ${vehicleId}`);
    return updatedLead;
  }
}

module.exports = new LeadService();
