const express = require('express');
const router = express.Router();
const Lead = require('./lead.model');
const Vehicle = require('../vehicles/vehicle.model');
const auth = require('../../shared/middlewares/auth.middleware');
const { success, paginated, error } = require('../../shared/utils/api-response');
const logger = require('../../config/logger');

router.use(auth);

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const { status, vehicleId, canal, page = 1, limit = 20 } = req.query;
    const query = { criadoPor: req.user.id };

    if (status) query.status = status;
    if (canal) query.canal = canal;
    if (vehicleId) query['interesse.vehicleId'] = vehicleId;

    const [data, total] = await Promise.all([
      Lead.find(query)
        .populate('interesse.vehicleId', 'codigo marca modelo ano fotos.principal')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .lean(),
      Lead.countDocuments(query),
    ]);

    res.json(
      paginated(data, {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      })
    );
  } catch (err) {
    logger.error('List leads error:', err);
    res.status(500).json(error('Erro ao listar leads'));
  }
});

// GET /api/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('interesse.vehicleId', 'codigo marca modelo ano precos fotos.principal')
      .lean();

    if (!lead) return res.status(404).json(error('Lead não encontrado'));
    res.json(success(lead));
  } catch (err) {
    res.status(500).json(error('Erro ao buscar lead'));
  }
});

// POST /api/leads
router.post('/', async (req, res) => {
  try {
    const { nome, whatsapp, interesse, canal, orcamento, cidade, notas } = req.body;

    if (!nome || !whatsapp) {
      return res.status(400).json(error('Nome e WhatsApp são obrigatórios'));
    }

    const lead = await Lead.create({
      nome,
      whatsapp,
      interesse,
      canal: canal || 'whatsapp',
      orcamento,
      cidade,
      notas,
      criadoPor: req.user.id,
    });

    // Adicionar lead ao veículo se houver vehicleId
    if (interesse?.vehicleId) {
      await Vehicle.findByIdAndUpdate(interesse.vehicleId, {
        $addToSet: { leads: lead._id },
      });
    }

    logger.info(`Novo lead: ${nome} (${whatsapp})`);
    res.status(201).json(success(lead, { message: 'Lead registrado com sucesso' }));
  } catch (err) {
    logger.error('Create lead error:', err);
    res.status(500).json(error('Erro ao criar lead'));
  }
});

// PATCH /api/leads/:id
router.patch('/:id', async (req, res) => {
  try {
    const { status, notas, orcamento, cidade, ultimoContato } = req.body;

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        ...(status && { status }),
        ...(notas !== undefined && { notas }),
        ...(orcamento !== undefined && { orcamento }),
        ...(cidade && { cidade }),
        ultimoContato: ultimoContato || new Date(),
      },
      { new: true }
    );

    if (!lead) return res.status(404).json(error('Lead não encontrado'));
    res.json(success(lead));
  } catch (err) {
    res.status(500).json(error('Erro ao atualizar lead'));
  }
});

// PATCH /api/leads/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['novo', 'contatado', 'interessado', 'proposta_enviada', 'fechado', 'perdido'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json(error('Status inválido'));
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { status, ultimoContato: new Date() },
      { new: true }
    );

    if (!lead) return res.status(404).json(error('Lead não encontrado'));
    res.json(success(lead));
  } catch (err) {
    res.status(500).json(error('Erro ao atualizar status do lead'));
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json(error('Lead não encontrado'));
    res.json(success(null, { message: 'Lead removido' }));
  } catch (err) {
    res.status(500).json(error('Erro ao remover lead'));
  }
});

module.exports = router;
