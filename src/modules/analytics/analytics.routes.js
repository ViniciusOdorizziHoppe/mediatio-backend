const express = require('express');
const router = express.Router();
const { authMiddleware, botAuthMiddleware } = require('../../shared/middlewares/auth.middleware');
const { success } = require('../../shared/utils/api-response');
const Vehicle = require('../vehicles/vehicle.model');
const Lead = require('../leads/lead.model');
const Appointment = require('../appointments/appointment.model');
const mongoose = require('mongoose');

/**
 * GET /api/analytics/bot-metrics
 * Métricas do dia para o admin via WhatsApp bot.
 * Protegido pela chave do bot (X-Bot-Key). Usa BOT_USER_ID como dono padrão.
 */
router.get('/bot-metrics', botAuthMiddleware, async (req, res, next) => {
  try {
    const rawUserId = req.query.userId || process.env.BOT_USER_ID;
    if (!rawUserId || !mongoose.Types.ObjectId.isValid(rawUserId)) {
      return res.status(400).json({ success: false, error: 'userId inválido' });
    }
    const userId = new mongoose.Types.ObjectId(rawUserId);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const [leadsHoje, leadsPorStatusHoje, leadsSemana, agendamentosHoje, veiculos] = await Promise.all([
      Lead.countDocuments({ criadoPor: userId, createdAt: { $gte: startOfDay } }),
      Lead.aggregate([
        { $match: { criadoPor: userId, createdAt: { $gte: startOfDay } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Lead.countDocuments({ criadoPor: userId, createdAt: { $gte: startOfWeek } }),
      Appointment.countDocuments({ criadoPor: userId, data: { $gte: startOfDay, $lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) } }),
      Vehicle.aggregate([
        { $match: { cadastradoPor: userId } },
        { $group: { _id: '$pipeline.status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusHoje = leadsPorStatusHoje.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {});
    const estoquePorStatus = veiculos.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {});
    const totalEstoque = veiculos.reduce((t, s) => t + s.count, 0);
    const disponiveis = estoquePorStatus.disponivel || 0;

    res.json(success({
      hoje: {
        leads: leadsHoje,
        interessados: statusHoje.interessado || 0,
        propostas: statusHoje.proposta_enviada || 0,
        fechados: statusHoje.fechado || 0,
        perdidos: statusHoje.perdido || 0,
        agendamentos: agendamentosHoje,
      },
      semana: {
        leads: leadsSemana,
      },
      estoque: {
        total: totalEstoque,
        disponiveis,
        porStatus: estoquePorStatus,
      },
    }));
  } catch (err) {
    next(err);
  }
});

router.use(authMiddleware);

/**
 * GET /api/analytics/dashboard
 * KPIs gerais do usuário
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const [vehicleStats, leadStats] = await Promise.all([
      Vehicle.aggregate([
        { $match: { cadastradoPor: userId } },
        {
          $group: {
            _id: '$pipeline.status',
            count: { $sum: 1 },
            valorTotal: { $sum: '$precos.venda' },
            comissaoTotal: { $sum: '$precos.comissaoEstimada' },
          },
        },
      ]),
      Lead.aggregate([
        { $match: { criadoPor: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    // Formata resultado
    const pipeline = {};
    let totalVeiculos = 0;
    let totalComissao = 0;
    let totalValor = 0;

    vehicleStats.forEach(s => {
      pipeline[s._id] = { count: s.count, valorTotal: s.valorTotal, comissaoTotal: s.comissaoTotal };
      totalVeiculos += s.count;
      totalComissao += s.comissaoTotal || 0;
      totalValor += s.valorTotal || 0;
    });

    const leads = {};
    let totalLeads = 0;
    leadStats.forEach(s => {
      leads[s._id] = s.count;
      totalLeads += s.count;
    });

    res.json(success({
      veiculos: {
        total: totalVeiculos,
        valorTotal: totalValor,
        comissaoTotal: totalComissao,
        porStatus: pipeline,
      },
      leads: {
        total: totalLeads,
        porStatus: leads,
      },
    }));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/pipeline
 * Distribuição do pipeline
 */
router.get('/pipeline', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { period } = req.query;
    
    const match = { cadastradoPor: userId };
    
    if (period === '7' || period === '30') {
      const days = parseInt(period);
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);
      match.createdAt = { $gte: dateLimit };
    }

    const data = await Vehicle.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$pipeline.status',
          count: { $sum: 1 },
          valorTotal: { $sum: '$precos.venda' },
        },
      },
      { $sort: { count: -1 } },
    ]);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/comissoes
 * Comissões por mês
 */
router.get('/comissoes', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const data = await Vehicle.aggregate([
      { $match: { cadastradoPor: userId, 'pipeline.status': 'vendido' } },
      {
        $group: {
          _id: {
            year: { $year: '$pipeline.dataVenda' },
            month: { $month: '$pipeline.dataVenda' },
          },
          total: { $sum: '$precos.comissaoEstimada' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/bot-performance
 * Performance da IA (leads e agendamentos)
 */
router.get('/bot-performance', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { period = '7' } = req.query;
    const days = parseInt(period);
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const [leadsData, stats] = await Promise.all([
      Lead.aggregate([
        { 
          $match: { 
            criadoPor: userId,
            createdAt: { $gte: dateLimit }
          } 
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            leads: { $sum: 1 },
            qualificados: { 
              $sum: { $cond: [{ $eq: ["$status", "interessado"] }, 1, 0] } 
            }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Lead.aggregate([
        { $match: { criadoPor: userId, createdAt: { $gte: dateLimit } } },
        {
          $group: {
            _id: null,
            totalLeads: { $sum: 1 },
            qualificados: { 
              $sum: { $cond: [{ $eq: ["$status", "interessado"] }, 1, 0] } 
            },
            agendamentos: { 
              $sum: { $cond: [{ $eq: ["$status", "proposta_enviada"] }, 1, 0] } 
            }
          }
        }
      ])
    ]);

    res.json(success({
      daily: leadsData,
      summary: stats[0] || { totalLeads: 0, qualificados: 0, agendamentos: 0 }
    }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
