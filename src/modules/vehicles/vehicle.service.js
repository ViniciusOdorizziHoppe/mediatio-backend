const vehicleRepository = require('./vehicle.repository');
const ScoreCalculator = require('./vehicle.score');
const logger = require('../../config/logger');

class VehicleService {
  async listVehicles(filters, options, userId) {
    try {
      const result = await vehicleRepository.findByUserId(userId, filters, options);
      return result;
    } catch (error) {
      logger.error('Erro ao listar veículos:', error);
      throw error;
    }
  }

  async getVehicleById(id, userId) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      const err = new Error('Veículo não encontrado');
      err.statusCode = 404;
      throw err;
    }
    // Verifica se o veículo pertence ao usuário
    if (vehicle.cadastradoPor?._id?.toString() !== userId) {
      const err = new Error('Acesso negado');
      err.statusCode = 403;
      throw err;
    }
    return vehicle;
  }

  async createVehicle(data, userId) {
    try {
      // Gera código automático: MOTO-2025-0001 ou CARRO-2025-0001.
      // Usa o maior código existente global (não count nem por-usuário)
      // para tolerar deleções e multi-usuário. Retenta até MAX_RETRIES
      // vezes caso haja colisão por race condition (E11000).
      const year = new Date().getFullYear();
      const prefix = data.tipo === 'moto' ? 'MOTO' : 'CARRO';

      // Tenta buscar FIPE automaticamente
      let fipeData = {};
      if (data.marca && data.modelo && data.ano) {
        try {
          const fipeService = require('../integrations/fipe/fipe.service');
          fipeData = await fipeService.buscarPreco(data.tipo, data.marca, data.modelo, data.ano);
        } catch (err) {
          logger.warn('FIPE não encontrado, continuando sem referência:', err.message);
        }
      }

      const baseData = {
        ...data,
        cadastradoPor: userId,
        precos: {
          ...data.precos,
          fipeReferencia: fipeData.preco,
          fipeMesReferencia: fipeData.mesReferencia,
        },
      };

      // Score inicial
      const calculator = new ScoreCalculator(baseData);
      baseData.score = calculator.calcular();

      let lastError;
      const MAX_RETRIES = 30;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        // A cada tentativa, busca max real do banco e adiciona offset
        // crescente. Garante convergência mesmo com concorrência alta
        // ou dados legados em qualquer estado.
        const next = await vehicleRepository.nextCodigoNumber(data.tipo, attempt);
        const codigo = `${prefix}-${year}-${String(next).padStart(4, '0')}`;
        try {
          const vehicle = await vehicleRepository.create({ ...baseData, codigo });
          logger.info(`Veículo criado: ${vehicle.codigo} por ${userId} (attempt=${attempt + 1})`);
          return vehicle;
        } catch (err) {
          if (err && err.code === 11000) {
            logger.warn(`[codigo] colisão attempt=${attempt + 1}/${MAX_RETRIES} codigo=${codigo} keyValue=${JSON.stringify(err.keyValue || {})} keyPattern=${JSON.stringify(err.keyPattern || {})}`);
            lastError = err;
            continue;
          }
          throw err;
        }
      }
      logger.error(`Falha ao gerar código único após ${MAX_RETRIES} tentativas para ${prefix}-${year}`);
      throw lastError || new Error('Não foi possível gerar código único');
    } catch (error) {
      logger.error('Erro ao criar veículo:', error);
      throw error;
    }
  }

  async updateVehicle(id, updateData, userId) {
    // Verifica se existe e pertence ao usuário
    await this.getVehicleById(id, userId);

    const vehicle = await vehicleRepository.update(id, {
      ...updateData,
      atualizadoPor: userId,
    });

    // Recalcula score se campos relevantes mudaram
    if (this.needsScoreRecalc(updateData)) {
      await this.recalculateScore(id, userId);
    }

    return vehicle;
  }

  async updateStatus(id, status, userId) {
    await this.getVehicleById(id, userId);
    logger.info(`Status alterado: ${id} → ${status} por ${userId}`);
    return vehicleRepository.updateStatus(id, status);
  }

  // Usado pelo bot (X-Bot-Key) — bypass do check de ownership porque
  // o bot já é autenticado pela chave e opera em nome do BOT_USER_ID.
  async updateStatusAsBot(id, status) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      const err = new Error('Veículo não encontrado');
      err.statusCode = 404;
      throw err;
    }
    logger.info(`[bot] Status alterado: ${id} → ${status}`);
    return vehicleRepository.updateStatus(id, status);
  }

  async deleteVehicle(id, userId) {
    await this.getVehicleById(id, userId);
    return vehicleRepository.delete(id);
  }

  async recalculateScore(id, userId) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      const err = new Error('Veículo não encontrado');
      err.statusCode = 404;
      throw err;
    }
    const calculator = new ScoreCalculator(vehicle);
    const newScore = calculator.calcular();
    await vehicleRepository.update(id, { score: newScore });
    return newScore;
  }

  async generateAdText(vehicleId, userId) {
    const vehicle = await this.getVehicleById(vehicleId, userId);
    const { marca, modelo, ano, cor, km, precos, condicoes, proprietario } = vehicle;

    const whatsapp =
      `*${marca} ${modelo} ${ano}*\n` +
      `🎨 Cor: ${cor || 'Não informada'}\n` +
      `📊 KM: ${km?.toLocaleString('pt-BR') || 'Não informado'}\n` +
      `💰 Valor: R$ ${precos?.venda?.toLocaleString('pt-BR')}\n` +
      `${condicoes?.aceitaTroca ? '✅ Aceita troca\n' : ''}` +
      `${condicoes?.aceitaFinanciamento ? '✅ Aceita financiamento\n' : ''}` +
      `\n📍 ${proprietario?.cidade || 'Consulte localização'}\n` +
      `📱 Chama no WhatsApp!`;

    const facebook =
      `${marca} ${modelo} ${ano} - ${cor || ''}\n\n` +
      `Veículo em ótimo estado! ${km ? km.toLocaleString('pt-BR') + 'km rodados.' : ''}\n` +
      `Preço: R$ ${precos?.venda?.toLocaleString('pt-BR')}\n\n` +
      `${condicoes?.aceitaTroca ? 'Aceitamos seu veículo na troca! ' : ''}` +
      `${condicoes?.aceitaFinanciamento ? 'Facilitamos financiamento. ' : ''}` +
      `\nEntre em contato para mais fotos e informações.`;

    return {
      whatsapp,
      facebook,
      instagram: whatsapp,
      metadata: { generatedAt: new Date(), version: '2.0' },
    };
  }

  async getAnalytics(userId) {
    return vehicleRepository.getAnalytics(userId);
  }

  needsScoreRecalc(data) {
    const relevantFields = ['fotos', 'condicoes', 'precos', 'anuncio', 'pipeline', 'proprietario', 'leads'];
    return Object.keys(data).some(key => relevantFields.some(f => key.includes(f)));
  }
}

module.exports = new VehicleService();
