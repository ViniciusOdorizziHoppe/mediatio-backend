const express = require('express');
const router = express.Router();
const fipeService = require('./fipe.service');
const { authMiddleware } = require('../../../shared/middlewares/auth.middleware');
const { success } = require('../../../shared/utils/api-response');

// Base route: status
router.get('/', authMiddleware, (req, res) => {
  res.json(success({
    service: 'FIPE API (parallelum.com.br)',
    status: 'online',
    endpoints: [
      'GET /api/fipe/busca-rapida?tipo=carro&marca=Volkswagen&modelo=Gol&ano=2020',
      'GET /api/fipe/marcas?tipo=carro',
      'GET /api/fipe/modelos?tipo=carro&marca=Volkswagen',
    ],
  }));
});

/**
 * GET /api/fipe/busca-rapida?tipo=moto&marca=Honda&modelo=CG+160&ano=2022
 */
router.get('/busca-rapida', authMiddleware, async (req, res, next) => {
  try {
    const { tipo, marca, modelo, ano } = req.query;
    if (!tipo || !marca || !modelo || !ano) {
      return res.status(400).json({
        success: false,
        error: 'Parametros obrigatorios: tipo, marca, modelo, ano',
      });
    }
    const result = await fipeService.buscaRapida(tipo, marca, modelo, parseInt(ano));
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/fipe/marcas?tipo=carro
 * Lista marcas disponiveis para autocomplete
 */
router.get('/marcas', authMiddleware, async (req, res, next) => {
  try {
    const { tipo } = req.query;
    const tipoFipe = { carro: 'carros', moto: 'motos', caminhao: 'caminhoes' }[tipo] || 'carros';
    const cacheKey = `fipe:marcas:${tipoFipe}`;

    const axios = require('axios');
    const { data } = await axios.get(`https://parallelum.com.br/fipe/api/v1/${tipoFipe}/brands`, { timeout: 8000 });
    const marcas = data.map(m => ({ codigo: m.code, nome: m.name }));
    res.json(success({ tipo: tipoFipe, total: marcas.length, marcas }));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/fipe/modelos?tipo=carro&marca=59 (codigo da marca)
 * Lista modelos de uma marca
 */
router.get('/modelos', authMiddleware, async (req, res, next) => {
  try {
    const { tipo, marca } = req.query;
    if (!tipo || !marca) {
      return res.status(400).json({ success: false, error: 'Parametros obrigatorios: tipo, marca (codigo)' });
    }
    const tipoFipe = { carro: 'carros', moto: 'motos', caminhao: 'caminhoes' }[tipo] || 'carros';

    const axios = require('axios');
    const { data } = await axios.get(
      `https://parallelum.com.br/fipe/api/v1/${tipoFipe}/brands/${marca}/models`,
      { timeout: 8000 }
    );
    const modelos = (data.models || data).map(m => ({ codigo: m.code, nome: m.name }));
    res.json(success({ tipo: tipoFipe, marca, total: modelos.length, modelos }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
