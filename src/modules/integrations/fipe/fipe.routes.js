const express = require('express');
const router = express.Router();
const fipeService = require('./fipe.service');
const { authMiddleware } = require('../../../shared/middlewares/auth.middleware');
const { success } = require('../../../shared/utils/api-response');

router.use(authMiddleware);

/**
 * GET /api/fipe/busca-rapida?tipo=moto&marca=Honda&modelo=CG+160&ano=2022
 */
router.get('/busca-rapida', async (req, res, next) => {
  try {
    const { tipo, marca, modelo, ano } = req.query;
    if (!tipo || !marca || !modelo || !ano) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros obrigatórios: tipo, marca, modelo, ano',
      });
    }
    const result = await fipeService.buscaRapida(tipo, marca, modelo, parseInt(ano));
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
