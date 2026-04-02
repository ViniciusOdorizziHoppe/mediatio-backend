// src/modules/leads/lead.controller.js
const leadService = require('./lead.service');
const { success } = require('../../shared/utils/api-response');

class LeadController {
  async list(req, res, next) {
    try {
      const { page, limit, status, search } = req.query;
      const result = await leadService.listLeads({ status, search }, { page, limit });
      res.json(success(result.data, { meta: result.meta }));
    } catch (err) { next(err); }
  }
  
  async getById(req, res, next) {
    try {
      const lead = await leadService.getLeadById(req.params.id);
      res.json(success(lead));
    } catch (err) { next(err); }
  }
  
  async create(req, res, next) {
    try {
      const lead = await leadService.createLead(req.body, req.user.id);
      res.status(201).json(success(lead));
    } catch (err) { next(err); }
  }
  
  async update(req, res, next) {
    try {
      const lead = await leadService.updateLead(req.params.id, req.body, req.user.id);
      res.json(success(lead));
    } catch (err) { next(err); }
  }
  
  async updateStatus(req, res, next) {
    try {
      const lead = await leadService.updateStatus(req.params.id, req.body.status);
      res.json(success(lead));
    } catch (err) { next(err); }
  }
}

module.exports = new LeadController();