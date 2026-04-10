const leadService = require('./lead.service');
const { createLeadSchema, updateLeadSchema } = require('./lead.schema');
const { success, paginated } = require('../../shared/utils/api-response');

class LeadController {
  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, status, canal, search } = req.query;
      const filters = {};
      if (status) filters.status = status;
      if (canal) filters.canal = canal;
      if (search) filters.search = search;

      const result = await leadService.listLeads(filters, { page, limit }, req.user.id);
      res.json(paginated(result.data, result));
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const lead = await leadService.getLeadById(req.params.id, req.user.id);
      res.json(success(lead));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = createLeadSchema.parse(req.body);
      const lead = await leadService.createLead(data, req.user.id);
      res.status(201).json(success(lead));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = updateLeadSchema.parse(req.body);
      const lead = await leadService.updateLead(req.params.id, data, req.user.id);
      res.json(success(lead));
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status é obrigatório' });
      }
      const lead = await leadService.updateLead(req.params.id, { status }, req.user.id);
      res.json(success(lead));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await leadService.deleteLead(req.params.id, req.user.id);
      res.json(success({ message: 'Lead removido com sucesso' }));
    } catch (err) {
      next(err);
    }
  }

  // Endpoint para bot N8N (usa X-Bot-Key ao invés de JWT)
  async botCreate(req, res, next) {
    try {
      const data = createLeadSchema.parse(req.body);
      // Bot usa um userId padrão (admin) — ajuste conforme necessário
      const adminUserId = process.env.BOT_USER_ID || req.body.userId;
      if (!adminUserId) {
        return res.status(400).json({ success: false, error: 'userId é obrigatório para bot' });
      }
      const result = await leadService.upsertLeadByWhatsapp(data, adminUserId);
      res.status(result.created ? 201 : 200).json(success(result.lead));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LeadController();
