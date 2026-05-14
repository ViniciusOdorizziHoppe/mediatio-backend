const Appointment = require('./appointment.model');
const { success } = require('../../shared/utils/api-response');
const logger = require('../../config/logger');

class AppointmentController {
  async list(req, res, next) {
    try {
      const { status, tipo, from, to } = req.query;
      const query = { criadoPor: req.user.id };
      if (status) query.status = status;
      if (tipo) query.tipo = tipo;
      if (from || to) {
        query.data = {};
        if (from) query.data.$gte = new Date(from);
        if (to) query.data.$lte = new Date(to);
      }
      const appointments = await Appointment.find(query)
        .populate('leadId', 'nome whatsapp')
        .populate('vehicleId', 'marca modelo ano placa')
        .sort({ data: 1 })
        .lean();

      res.json(success(appointments));
    } catch (e) {
      logger.error('Erro ao listar appointments:', e);
      next(e);
    }
  }

  async create(req, res, next) {
    try {
      const { leadId, vehicleId, data, tipo, status, notas } = req.body;

      if (!leadId) {
        return res.status(400).json({ success: false, error: 'leadId e obrigatorio' });
      }
      if (!data) {
        return res.status(400).json({ success: false, error: 'data e obrigatoria' });
      }

      const appointment = await Appointment.create({
        leadId,
        vehicleId,
        data: new Date(data),
        tipo: tipo || 'test_drive',
        status: status || 'pendente',
        notas,
        criadoPor: req.user.id,
      });

      const populated = await Appointment.findById(appointment._id)
        .populate('leadId', 'nome whatsapp')
        .populate('vehicleId', 'marca modelo ano placa');

      res.status(201).json(success(populated));
    } catch (e) {
      logger.error('Erro ao criar appointment:', e);
      next(e);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const appointment = await Appointment.findOneAndUpdate(
        { _id: id, criadoPor: req.user.id },
        { $set: req.body },
        { new: true }
      ).populate('leadId', 'nome whatsapp').populate('vehicleId', 'marca modelo ano placa');

      if (!appointment) {
        return res.status(404).json({ success: false, error: 'Agendamento nao encontrado' });
      }
      res.json(success(appointment));
    } catch (e) {
      logger.error('Erro ao atualizar appointment:', e);
      next(e);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const appointment = await Appointment.findOneAndDelete({ _id: id, criadoPor: req.user.id });
      if (!appointment) {
        return res.status(404).json({ success: false, error: 'Agendamento nao encontrado' });
      }
      res.json(success({ message: 'Agendamento removido' }));
    } catch (e) {
      logger.error('Erro ao deletar appointment:', e);
      next(e);
    }
  }
}

module.exports = new AppointmentController();
