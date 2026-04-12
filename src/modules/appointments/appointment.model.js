const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    data: {
      type: Date,
      required: true,
    },
    tipo: {
      type: String,
      enum: ['test_drive', 'avaliacao', 'entrega', 'reuniao', 'outro'],
      default: 'test_drive',
    },
    status: {
      type: String,
      enum: ['pendente', 'confirmado', 'cancelado', 'concluido'],
      default: 'pendente',
    },
    notas: String,
    criadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
