const Appointment = require('./appointment.model');
const apiResponse = require('../../shared/utils/api-response');

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
        .sort('data');
      return apiResponse.success(res, appointments);
    } catch (e) {
      next(e);
    }
  }

  async create(req, res, next) {
    try {
      const { leadId, vehicleId, data, tipo, status, notas } = req.body;

      // ✅ VALIDAÇÃO: leadId é obrigatório
      if (!leadId) {
        return res.status(400).json({ 
          success: false, 
          error: 'leadId é obrigatório' 
        });
      }

      // ✅ VALIDAÇÃO: data é obrigatória
      if (!data) {
        return res.status(400).json({ 
          success: false, 
          error: 'data é obrigatória' 
        });
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

      return apiResponse.success(res, appointment, 201);
    } catch (e) {
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
      );
      if (!appointment) return res.status(404).json({ success: false, error: 'Agendamento não encontrado' });
      return apiResponse.success(res, appointment);
    } catch (e) {
      next(e);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const appointment = await Appointment.findOneAndDelete({ _id: id, criadoPor: req.user.id });
      if (!appointment) return res.status(404).json({ success: false, error: 'Agendamento não encontrado' });
      return apiResponse.success(res, { message: 'Agendamento removido' });
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new AppointmentController();
