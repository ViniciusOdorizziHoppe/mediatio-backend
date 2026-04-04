const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Vehicle = require('../vehicles/vehicle.model');
const Lead = require('../leads/lead.model');
const auth = require('../../shared/middlewares/auth.middleware');
const { success, error } = require('../../shared/utils/api-response');

router.use(auth);

// GET /api/analytics/dashboard
// Retorna KPIs gerais: veículos ativos, vendidos no mês, comissão, leads, conversão
router.get('/dashboard', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const [
      totalAtivos,
      totalVendidos,
      vendasMes,
      totalLeads,
      leadsFechados,
      comissaoMes,
      comissaoTotal,
      distribuicao,
    ] = await Promise.all([
      // Total de veículos disponíveis
      Vehicle.countDocuments({ cadastradoPor: userId, 'pipeline.status': { $in: ['disponivel', 'contato_ativo', 'proposta'] } }),

      // Total vendidos histórico
      Vehicle.countDocuments({ cadastradoPor: userId, 'pipeline.status': 'vendido' }),

      // Vendas este mês
      Vehicle.countDocuments({
        cadastradoPor: userId,
        'pipeline.status': 'vendido',
        'pipeline.dataVenda': { $gte: inicioMes },
      }),

      // Total de leads
      Lead.countDocuments({ criadoPor: userId }),

      // Leads fechados (convertidos)
      Lead.countDocuments({ criadoPor: userId, status: 'fechado' }),

      // Comissão deste mês
      Vehicle.aggregate([
        {
          $match: {
            cadastradoPor: userId,
            'pipeline.status': 'vendido',
            'pipeline.dataVenda': { $gte: inicioMes },
          },
        },
        { $group: { _id: null, total: { $sum: '$precos.comissaoEstimada' } } },
      ]),

      // Comissão total histórica
      Vehicle.aggregate([
        { $match: { cadastradoPor: userId, 'pipeline.status': 'vendido' } },
        { $group: { _id: null, total: { $sum: '$precos.comissaoEstimada' } } },
      ]),

      // Distribuição por status do pipeline
      Vehicle.aggregate([
        { $match: { cadastradoPor: userId } },
        { $group: { _id: '$pipeline.status', count: { $sum: 1 } } },
      ]),
    ]);

    const taxaConversao =
      totalLeads > 0 ? ((leadsFechados / totalLeads) * 100).toFixed(1) : 0;

    // Montar pipeline como objeto
    const pipeline = {};
    distribuicao.forEach((d) => { pipeline[d._id] = d.count; });

    res.json(
      success({
        veiculosAtivos: totalAtivos,
        totalVendidos,
        vendasMes,
        totalLeads,
        leadsFechados,
        taxaConversao: Number(taxaConversao),
        comissaoMes: comissaoMes[0]?.total || 0,
        comissaoTotal: comissaoTotal[0]?.total || 0,
        pipeline: {
          disponivel: pipeline.disponivel || 0,
          contato_ativo: pipeline.contato_ativo || 0,
          proposta: pipeline.proposta || 0,
          vendido: pipeline.vendido || 0,
          arquivado: pipeline.arquivado || 0,
        },
      })
    );
  } catch (err) {
    res.status(500).json(error('Erro ao carregar dashboard'));
  }
});

// GET /api/analytics/comissoes — últimos 6 meses
router.get('/comissoes', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const meses = parseInt(req.query.meses) || 6;
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - meses);

    const dados = await Vehicle.aggregate([
      {
        $match: {
          cadastradoPor: userId,
          'pipeline.status': 'vendido',
          'pipeline.dataVenda': { $gte: dataInicio },
        },
      },
      {
        $group: {
          _id: {
            ano: { $year: '$pipeline.dataVenda' },
            mes: { $month: '$pipeline.dataVenda' },
          },
          vendas: { $sum: 1 },
          comissao: { $sum: '$precos.comissaoEstimada' },
          ticketMedio: { $avg: '$precos.venda' },
        },
      },
      { $sort: { '_id.ano': 1, '_id.mes': 1 } },
    ]);

    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const resultado = dados.map((d) => ({
      periodo: `${mesesNomes[d._id.mes - 1]}/${d._id.ano}`,
      mes: d._id.mes,
      ano: d._id.ano,
      vendas: d.vendas,
      comissao: Math.round(d.comissao),
      ticketMedio: Math.round(d.ticketMedio),
    }));

    res.json(success(resultado));
  } catch (err) {
    res.status(500).json(error('Erro ao carregar comissões'));
  }
});

// GET /api/analytics/pipeline — funil por status
router.get('/pipeline', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const dados = await Vehicle.aggregate([
      { $match: { cadastradoPor: userId } },
      {
        $group: {
          _id: '$pipeline.status',
          count: { $sum: 1 },
          valorTotal: { $sum: '$precos.venda' },
          scoreMedia: { $avg: '$score.valor' },
        },
      },
    ]);

    const ordem = ['disponivel', 'contato_ativo', 'proposta', 'vendido', 'arquivado'];
    const labels = {
      disponivel: 'Disponível',
      contato_ativo: 'Em Negociação',
      proposta: 'Proposta Enviada',
      vendido: 'Vendido',
      arquivado: 'Arquivado',
    };

    const resultado = ordem.map((status) => {
      const item = dados.find((d) => d._id === status) || {};
      return {
        status,
        label: labels[status],
        count: item.count || 0,
        valorTotal: Math.round(item.valorTotal || 0),
        scoreMedia: Math.round(item.scoreMedia || 0),
      };
    });

    res.json(success(resultado));
  } catch (err) {
    res.status(500).json(error('Erro ao carregar pipeline'));
  }
});

// GET /api/analytics/distribuicao — motos vs carros
router.get('/distribuicao', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const dados = await Vehicle.aggregate([
      { $match: { cadastradoPor: userId } },
      {
        $group: {
          _id: '$tipo',
          total: { $sum: 1 },
          vendidos: {
            $sum: { $cond: [{ $eq: ['$pipeline.status', 'vendido'] }, 1, 0] },
          },
          comissao: { $sum: '$precos.comissaoEstimada' },
        },
      },
    ]);

    res.json(success(dados));
  } catch (err) {
    res.status(500).json(error('Erro ao carregar distribuição'));
  }
});

// GET /api/analytics/tempo-pipeline — tempo médio de venda por modelo
router.get('/tempo-pipeline', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const dados = await Vehicle.aggregate([
      {
        $match: {
          cadastradoPor: userId,
          'pipeline.status': 'vendido',
          'pipeline.dataVenda': { $exists: true },
        },
      },
      {
        $project: {
          marca: 1,
          modelo: 1,
          diasParaVenda: '$pipeline.diasNoPipeline',
          comissao: '$precos.comissaoEstimada',
        },
      },
      {
        $group: {
          _id: { marca: '$marca', modelo: '$modelo' },
          diasMedio: { $avg: '$diasParaVenda' },
          vendas: { $sum: 1 },
          comissaoMedia: { $avg: '$comissao' },
        },
      },
      { $sort: { diasMedio: 1 } },
      { $limit: 10 },
    ]);

    const resultado = dados.map((d) => ({
      modelo: `${d._id.marca} ${d._id.modelo}`,
      diasMedio: Math.round(d.diasMedio),
      vendas: d.vendas,
      comissaoMedia: Math.round(d.comissaoMedia || 0),
    }));

    res.json(success(resultado));
  } catch (err) {
    res.status(500).json(error('Erro ao carregar tempo de pipeline'));
  }
});

module.exports = router;
