/**
 * FIPE Service — Tabela de referência de preços de veículos
 * API: https://parallelum.com.br/fipe/api/v2
 * Cache: 24h em memória (node-cache)
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../../../config/logger');

class FipeService {
  constructor() {
    this.baseURL = 'https://parallelum.com.br/fipe/api/v2';
    this.cache = new NodeCache({ stdTTL: 86400 }); // 24 horas
    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 12000,
      headers: { Accept: 'application/json' },
    });
  }

  // Mapeia tipo amigável para o path da API
  _tipoPath(tipo) {
    const mapa = { moto: 'motorcycles', carro: 'cars', caminhao: 'trucks' };
    return mapa[tipo] || 'motorcycles';
  }

  async _get(url) {
    const cached = this.cache.get(url);
    if (cached) return cached;

    const { data } = await this.http.get(url);
    this.cache.set(url, data);
    return data;
  }

  async getMarcas(tipo = 'moto') {
    try {
      const path = this._tipoPath(tipo);
      return await this._get(`/vehicles/${path}/brands`);
    } catch (err) {
      logger.error('FIPE getMarcas error:', err.message);
      throw new Error('Não foi possível carregar as marcas');
    }
  }

  async getModelos(tipo, marcaId) {
    try {
      const path = this._tipoPath(tipo);
      return await this._get(`/vehicles/${path}/brands/${marcaId}/models`);
    } catch (err) {
      logger.error('FIPE getModelos error:', err.message);
      throw new Error('Não foi possível carregar os modelos');
    }
  }

  async getAnos(tipo, marcaId, modeloId) {
    try {
      const path = this._tipoPath(tipo);
      return await this._get(`/vehicles/${path}/brands/${marcaId}/models/${modeloId}/years`);
    } catch (err) {
      logger.error('FIPE getAnos error:', err.message);
      throw new Error('Não foi possível carregar os anos');
    }
  }

  async getPreco(tipo, marcaId, modeloId, anoId) {
    try {
      const path = this._tipoPath(tipo);
      const data = await this._get(
        `/vehicles/${path}/brands/${marcaId}/models/${modeloId}/years/${anoId}`
      );

      return {
        preco: this._parsePreco(data.price || data.valor),
        mesReferencia: data.referenceMonth || data.mesReferencia,
        codigoFipe: data.codeFipe || data.codigoFipe,
        combustivel: data.fuel || data.combustivel,
        modelo: data.model || data.modelo,
        marca: data.brand || data.marca,
        atualizadoEm: new Date(),
      };
    } catch (err) {
      logger.error('FIPE getPreco error:', err.message);
      throw new Error('Não foi possível consultar o preço FIPE');
    }
  }

  /**
   * Busca rápida por nome — tenta encontrar a combinação exata
   * Ex: buscaRapida('moto', 'Honda', 'CG 160', 2022)
   */
  async buscaRapida(tipo, marcaNome, modeloNome, ano) {
    const cacheKey = `fipe_rapida_${tipo}_${marcaNome}_${modeloNome}_${ano}`.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const path = this._tipoPath(tipo);

      // 1. Buscar marca
      const marcas = await this._get(`/vehicles/${path}/brands`);
      const marca = marcas.find(
        (m) =>
          m.name.toLowerCase().includes(marcaNome.toLowerCase()) ||
          marcaNome.toLowerCase().includes(m.name.toLowerCase())
      );
      if (!marca) throw new Error(`Marca "${marcaNome}" não encontrada`);

      // 2. Buscar modelos
      const modelos = await this._get(`/vehicles/${path}/brands/${marca.code}/models`);
      const modelo = modelos.find((m) =>
        m.name.toLowerCase().includes(modeloNome.toLowerCase()) ||
        modeloNome.toLowerCase().includes(m.name.toLowerCase().split(' ')[0])
      );
      if (!modelo) throw new Error(`Modelo "${modeloNome}" não encontrado`);

      // 3. Buscar anos
      const anos = await this._get(
        `/vehicles/${path}/brands/${marca.code}/models/${modelo.code}/years`
      );
      const anoItem = anos.find((a) => a.name.includes(String(ano)));
      if (!anoItem) throw new Error(`Ano ${ano} não encontrado`);

      // 4. Buscar preço
      const resultado = await this.getPreco(tipo, marca.code, modelo.code, anoItem.code);
      this.cache.set(cacheKey, resultado);
      return resultado;
    } catch (err) {
      logger.warn(`FIPE busca rápida falhou: ${err.message}`);
      throw err;
    }
  }

  _parsePreco(precoStr) {
    if (typeof precoStr === 'number') return precoStr;
    if (!precoStr) return 0;
    return parseFloat(
      String(precoStr)
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim()
    );
  }
}

module.exports = new FipeService();
