const VehicleRepository = require('./vehicle.repository');
const ScoreCalculator = require('./vehicle.score');
const FipeService = require('../integrations/fipe/fipe.service');
const logger = require('../../config/logger');

class VehicleService {
  constructor() {
    this.repository = VehicleRepository;
    this.fipeService = FipeService;
  }
  
  async listVehicles(filters, options) {
    try {
      return await this.repository.findAll(filters, options);
    } catch (error) {
      logger.error('Erro ao listar veículos:', error);
      throw new Error('Falha ao recuperar lista de veículos');
    }
  }
  
  async getVehicleById(id) {
    const vehicle = await this.repository.findById(id);
    if (!vehicle) throw new Error('Veículo não encontrado');
    return vehicle;
  }
  
  async createVehicle(data, userId) {
    try {
      // Gera código automático: MOTO-2025-0001
      const count = await this.repository.countDocuments({ tipo: data.tipo });
      const year = new Date().getFullYear();
      const prefix = data.tipo === 'moto' ? 'MOTO' : 'CARRO';
      const codigo = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
      
      // Busca FIPE automaticamente se tiver dados suficientes
      let fipeData = {};
      if (data.marca && data.modelo && data.ano) {
        try {
          fipeData = await this.fipeService.buscarPreco(
            data.tipo, 
            data.marca, 
            data.modelo, 
            data.ano
          );
        } catch (err) {
          logger.warn('FIPE não encontrado, continuando sem referência:', err.message);
        }
      }
      
      const vehicleData = {
        ...data,
        codigo,
        cadastradoPor: userId,
        precos: {
          ...data.precos,
          fipeReferencia: fipeData.preco,
          fipeMesReferencia: fipeData.mesReferencia
        }
      };
      
      // Calcula score inicial
      const calculator = new ScoreCalculator(vehicleData);
      vehicleData.score = calculator.calcular();
      
      const vehicle = await this.repository.create(vehicleData);
      
      logger.info(`Veículo criado: ${vehicle.codigo} por ${userId}`);
      return vehicle;
      
    } catch (error) {
      logger.error('Erro ao criar veículo:', error);
      throw error;
    }
  }
  
  async updateVehicle(id, updateData, userId) {
    // Recalcula score se dados relevantes mudaram
    const needsRecalc = this.checkIfNeedsScoreRecalculation(updateData);
    
    const vehicle = await this.repository.update(id, {
      ...updateData,
      atualizadoPor: userId
    });
    
    if (needsRecalc) {
      await this.recalculateScore(id);
    }
    
    return vehicle;
  }
  
  async updateStatus(id, status, userId) {
    logger.info(`Status alterado: ${id} → ${status} por ${userId}`);
    return this.repository.updateStatus(id, status);
  }
  
  async recalculateScore(id) {
    const vehicle = await this.repository.findById(id);
    if (!vehicle) throw new Error('Veículo não encontrado');
    
    const calculator = new ScoreCalculator(vehicle);
    const newScore = calculator.calcular();
    
    await this.repository.update(id, { score: newScore });
    return newScore;
  }
  
  checkIfNeedsScoreRecalculation(data) {
    const relevantFields = [
      'fotos', 'condicoes', 'precos', 'anuncio', 
      'pipeline', 'proprietario'
    ];
    return Object.keys(data).some(key => 
      relevantFields.some(field => key.includes(field))
    );
  }
  
  async generateAdText(vehicleId) {
    const vehicle = await this.getVehicleById(vehicleId);
    
    // Template engine simples (pode ser substituído por IA depois)
    const { marca, modelo, ano, cor, km, precos, condicoes, proprietario } = vehicle;
    
    const whatsapp = `*${marca} ${modelo} ${ano}*\n` +
      `🎨 Cor: ${cor}\n` +
      `📊 KM: ${km?.toLocaleString('pt-BR')}\n` +
      `💰 Valor: R$ ${precos?.venda?.toLocaleString('pt-BR')}\n` +
      `${condicoes?.aceitaTroca ? '✅ Aceita troca\n' : ''}` +
      `${condicoes?.aceitaFinanciamento ? '✅ Aceita financiamento\n' : ''}` +
      `\n📍 ${proprietario?.cidade || 'Localização'}\n` +
      `📱 Chama no WhatsApp!`;
    
    const facebook = `${marca} ${modelo} ${ano} - ${cor}\n\n` +
      `Veículo em ótimo estado! ${km}km rodados.\n` +
      `Preço justo: R$ ${precos?.venda?.toLocaleString('pt-BR')}\n\n` +
      `${condicoes?.aceitaTroca ? 'Aceitamos seu veículo na troca! ' : ''}` +
      `${condicoes?.aceitaFinanciamento ? 'Facilitamos financiamento. ' : ''}` +
      `\nEntre em contato para mais fotos e informações.`;
    
    return {
      whatsapp,
      facebook,
      instagram: whatsapp, // Mais curto para IG
      metadata: { generatedAt: new Date(), version: '1.0' }
    };
  }
}

module.exports = new VehicleService();