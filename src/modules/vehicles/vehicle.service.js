const VehicleRepository = require('./vehicle.repository');
const ScoreCalculator = require('./vehicle.score');
const { uploadToCloudinary, deleteFromCloudinary, getThumbnailUrl } = require('../../shared/middlewares/upload.middleware');
const logger = require('../../config/logger');

class VehicleService {
  async list(filters, options) {
    return VehicleRepository.findAll(filters, options);
  }

  async getById(id) {
    const vehicle = await VehicleRepository.findById(id);
    if (!vehicle) {
      const err = new Error('Veículo não encontrado');
      err.statusCode = 404;
      throw err;
    }
    return vehicle;
  }

  async create(data, userId) {
    // Gera código automático: MOTO-2025-0001 / CARRO-2025-0001
    const count = await VehicleRepository.countDocuments({ tipo: data.tipo });
    const year = new Date().getFullYear();
    const prefix = data.tipo === 'moto' ? 'MOTO' : 'CARRO';
    const codigo = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;

    const vehicleData = {
      ...data,
      codigo,
      cadastradoPor: userId,
    };

    // Score inicial
    const calculator = new ScoreCalculator(vehicleData);
    vehicleData.score = calculator.calcular();

    const vehicle = await VehicleRepository.create(vehicleData);
    logger.info(`Veículo criado: ${vehicle.codigo} por usuário ${userId}`);
    return vehicle;
  }

  async update(id, data, userId) {
    const vehicle = await VehicleRepository.update(id, {
      ...data,
      atualizadoPor: userId,
    });

    if (!vehicle) {
      const err = new Error('Veículo não encontrado');
      err.statusCode = 404;
      throw err;
    }

    // Recalcula score sempre que veículo é atualizado
    await this.recalculateScore(id);
    return VehicleRepository.findById(id);
  }

  async updateStatus(id, status, userId) {
    const vehicle = await VehicleRepository.updateStatus(id, status);
    if (!vehicle) {
      const err = new Error('Veículo não encontrado');
      err.statusCode = 404;
      throw err;
    }
    logger.info(`Status atualizado: ${id} → ${status}`);
    return vehicle;
  }

  async delete(id) {
    return VehicleRepository.delete(id);
  }

  async recalculateScore(id) {
    const vehicle = await VehicleRepository.findById(id);
    if (!vehicle) return null;

    const calculator = new ScoreCalculator(vehicle);
    const newScore = calculator.calcular();
    await VehicleRepository.updateScore(id, newScore);
    return newScore;
  }

  /**
   * Upload de foto original do veículo para o Cloudinary
   * Pasta: mediatio/vehicles/{codigo}/originais/
   */
  async uploadPhoto(vehicleId, fileBuffer, mimetype, originalname) {
    const vehicle = await this.getById(vehicleId);

    const ext = originalname.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const publicId = `${timestamp}`;
    const folder = `mediatio/vehicles/${vehicle.codigo}/originais`;

    const result = await uploadToCloudinary(fileBuffer, folder, publicId);
    const thumbnailUrl = getThumbnailUrl(result.public_id, 400);

    const fotoData = {
      url: result.secure_url,
      thumbnailUrl,
      publicId: result.public_id,
      formato: result.format,
      bytes: result.bytes,
      largura: result.width,
      altura: result.height,
    };

    // Se é a primeira foto, define como principal
    const updatedVehicle = await VehicleRepository.addPhoto(vehicleId, fotoData, 'original');
    if (!vehicle.fotos?.principal) {
      await VehicleRepository.setPrincipalPhoto(vehicleId, result.secure_url, result.public_id);
    }

    // Recalcula score após nova foto
    await this.recalculateScore(vehicleId);

    logger.info(`Foto adicionada ao veículo ${vehicle.codigo}: ${result.public_id}`);
    return fotoData;
  }

  /**
   * Remove foto do veículo (Cloudinary + MongoDB)
   */
  async deletePhoto(vehicleId, photoId, publicId, tipo = 'original') {
    // Remove do Cloudinary
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }

    // Remove do banco
    const vehicle = await VehicleRepository.removePhoto(vehicleId, photoId, tipo);

    // Recalcula score
    await this.recalculateScore(vehicleId);

    return vehicle;
  }

  /**
   * Define foto principal do veículo
   */
  async setPrincipalPhoto(vehicleId, url, publicId) {
    return VehicleRepository.setPrincipalPhoto(vehicleId, url, publicId);
  }

  /**
   * Gera textos de anúncio para WhatsApp, Facebook e Instagram
   */
  generateAdText(vehicle) {
    const {
      marca,
      modelo,
      ano,
      cor,
      km,
      precos,
      condicoes,
      proprietario,
      anuncio,
    } = vehicle;

    const kmFormatado = km?.toLocaleString('pt-BR') || '—';
    const precoFormatado = precos?.venda?.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }) || '—';

    const whatsapp =
      `🏍️ *${marca} ${modelo} ${ano}*\n\n` +
      `🎨 Cor: ${cor || '—'}\n` +
      `📊 KM: ${kmFormatado}\n` +
      `💰 Valor: ${precoFormatado}\n` +
      (condicoes?.aceitaTroca ? `✅ Aceita troca\n` : '') +
      (condicoes?.aceitaFinanciamento ? `✅ Aceita financiamento\n` : '') +
      `📍 ${proprietario?.cidade || 'SC'}\n\n` +
      (anuncio?.observacoes ? `📝 ${anuncio.observacoes}\n\n` : '') +
      `📲 Entre em contato para mais informações!`;

    const facebook =
      `${marca} ${modelo} ${ano} | ${cor} | ${kmFormatado} km\n\n` +
      `Veículo bem conservado, documentação em dia!\n\n` +
      `💰 ${precoFormatado}\n` +
      (condicoes?.aceitaTroca ? `↔️ Aceitamos seu veículo na troca\n` : '') +
      (condicoes?.aceitaFinanciamento ? `💳 Financiamento disponível\n` : '') +
      `\n📍 ${proprietario?.cidade || 'Região de Presidente Getúlio, SC'}\n` +
      (anuncio?.observacoes ? `\n${anuncio.observacoes}\n` : '') +
      `\nChame no WhatsApp! 👇`;

    return { whatsapp, facebook, instagram: whatsapp };
  }

  async generateAd(vehicleId) {
    const vehicle = await this.getById(vehicleId);
    const texts = this.generateAdText(vehicle);

    // Salva os textos no banco
    await VehicleRepository.update(vehicleId, {
      'anuncio.whatsappText': texts.whatsapp,
      'anuncio.facebookText': texts.facebook,
      'anuncio.instagramText': texts.instagram,
    });

    return texts;
  }
}

module.exports = new VehicleService();
