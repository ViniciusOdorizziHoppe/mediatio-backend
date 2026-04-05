const express = require('express');
const router = express.Router();
const controller = require('./vehicle.controller');
const auth = require('../../shared/middlewares/auth.middleware');
const { validate, createVehicleSchema, updateStatusSchema } = require('./vehicle.schema');

// ── GET público (bots N8N podem listar sem auth) ─────────────
// Lista veículos disponíveis — sem autenticação (dados públicos de venda)
router.get('/publico', async (req, res) => {
  try {
    const Vehicle = require('./vehicle.model');
    const veiculos = await Vehicle.find(
      { 'pipeline.status': 'disponivel' },
      'codigo tipo marca modelo ano cor km precos condicoes proprietario.cidade fotos.principal score.valor score.label'
    )
      .sort({ 'score.valor': -1 })
      .limit(20)
      .lean();

    res.json({ success: true, data: veiculos });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao listar veículos' });
  }
});

// ── Todas as rotas abaixo exigem autenticação ─────────────────
router.use(auth);

// ── CRUD ──────────────────────────────────────────────────────
router.get('/', controller.list.bind(controller));
router.get('/:id', controller.getById.bind(controller));

// POST com normalização de campos do bot (precoVenda → precos.venda)
router.post('/', (req, res, next) => {
  // Normalizar campos que o bot N8N envia em formato flat
  const body = req.body;

  if (body.precoVenda !== undefined && !body.precos) {
    body.precos = {
      venda: body.precoVenda,
      compra: body.precoCompra,
      minimo: body.precoMinimo,
    };
    delete body.precoVenda;
    delete body.precoCompra;
    delete body.precoMinimo;
  }

  // Normalizar documentacao que pode vir fora de condicoes
  if (body.documentacao !== undefined && !body.condicoes?.documentacao) {
    body.condicoes = body.condicoes || {};
    body.condicoes.documentacao = body.documentacao;
    delete body.documentacao;
  }

  if (body.aceitaTroca !== undefined && body.condicoes === undefined) {
    body.condicoes = {};
  }
  if (body.aceitaTroca !== undefined) {
    body.condicoes.aceitaTroca = body.aceitaTroca;
    delete body.aceitaTroca;
  }
  if (body.aceitaFinanciamento !== undefined) {
    if (!body.condicoes) body.condicoes = {};
    body.condicoes.aceitaFinanciamento = body.aceitaFinanciamento;
    delete body.aceitaFinanciamento;
  }

  // Para bot: o user pode não ter um ID real
  if (req.user.role === 'bot') {
    // Pegar o primeiro usuário admin do sistema como cadastradoPor
    const User = require('../auth/auth.model');
    User.findOne({ role: 'admin' }).then(admin => {
      if (admin) req.user.id = admin._id.toString();
      next();
    }).catch(() => next());
  } else {
    next();
  }
}, validate(createVehicleSchema), controller.create.bind(controller));

router.patch('/:id', controller.update.bind(controller));
router.patch('/:id/status', validate(updateStatusSchema), controller.updateStatus.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

// ── Ações ─────────────────────────────────────────────────────
router.post('/:id/generate-ad', controller.generateAd.bind(controller));
router.post('/:id/recalculate-score', controller.recalculateScore.bind(controller));

// ── Fotos (Cloudinary) ─────────────────────────────────────────
// Upload seguro com try/catch para não quebrar se cloudinary não estiver configurado
router.post('/:id/photos', (req, res, next) => {
  try {
    const { upload } = require('../../shared/middlewares/upload.middleware');
    upload.single('foto')(req, res, next);
  } catch (err) {
    res.status(503).json({
      success: false,
      error: 'Upload de fotos não configurado. Adicione CLOUDINARY_API_KEY no Koyeb.',
    });
  }
}, controller.uploadPhoto.bind(controller));

router.delete('/:id/photos', controller.deletePhoto.bind(controller));
router.patch('/:id/photos/principal', controller.setPrincipalPhoto.bind(controller));

module.exports = router;
