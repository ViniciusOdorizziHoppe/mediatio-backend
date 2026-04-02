// src/modules/leads/lead.routes.js
const express = require('express');
const router = express.Router();
const controller = require('./lead.controller');
const auth = require('../../shared/middlewares/auth.middleware');

router.use(auth);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.patch('/:id/status', controller.updateStatus);

module.exports = router;