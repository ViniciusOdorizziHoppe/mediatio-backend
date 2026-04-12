const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { success } = require('../../shared/utils/api-response');
const Vehicle = require('../vehicles/vehicle.model');
const Lead = require('../leads/lead.model');
const mongoose = require('mongoose');

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
