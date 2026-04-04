const express = require('express');
const router = express.Router();
const FipeService = require('./fipe.service');
const auth = require('../../../shared/middlewares/auth.middleware');
const { success, error } = require('../../../shared/utils/api-response');

router.use(auth);

// GET /api/fipe/marcas?tipo=moto
router.get('/marcas', async (req, res) => {
  try {
    const { tipo = 'moto' } = req.query;
    const marcas = await FipeService.getMarcas(tipo);
    res.json(success(marcas));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/fipe/modelos?tipo=moto&marcaId=97
router.get('/modelos', async (req, res) => {
  try {
    const { tipo = 'moto', marcaId } = req.query;
    if (!marcaId) return res.status(400).json(error('marcaId é obrigatório'));
    const modelos = await FipeService.getModelos(tipo, marcaId);
    res.json(success(modelos));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/fipe/anos?tipo=moto&marcaId=97&modeloId=5617
router.get('/anos', async (req, res) => {
  try {
    const { tipo = 'moto', marcaId, modeloId } = req.query;
    if (!marcaId || !modeloId) return res.status(400).json(error('marcaId e modeloId são obrigatórios'));
    const anos = await FipeService.getAnos(tipo, marcaId, modeloId);
    res.json(success(anos));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/fipe/preco?tipo=moto&marcaId=97&modeloId=5617&anoId=2022-1
router.get('/preco', async (req, res) => {
  try {
    const { tipo = 'moto', marcaId, modeloId, anoId } = req.query;
    if (!marcaId || !modeloId || !anoId) {
      return res.status(400).json(error('marcaId, modeloId e anoId são obrigatórios'));
    }
    const preco = await FipeService.getPreco(tipo, marcaId, modeloId, anoId);
    res.json(success(preco));
  } catch (err) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/fipe/busca-rapida?tipo=moto&marca=Honda&modelo=CG 160&ano=2022
router.get('/busca-rapida', async (req, res) => {
  try {
    const { tipo = 'moto', marca, modelo, ano } = req.query;
    if (!marca || !modelo || !ano) {
      return res.status(400).json(error('marca, modelo e ano são obrigatórios'));
    }
    const result = await FipeService.buscaRapida(tipo, marca, modelo, parseInt(ano));
    res.json(success(result));
  } catch (err) {
    res.status(404).json(error(err.message || 'Veículo não encontrado na FIPE'));
  }
});

module.exports = router;
