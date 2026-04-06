const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../../../config/logger');

// Cache com TTL de 24 horas
const cache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

const FIPE_BASE_URL = 'https://parallelum.com.br/fipe/api/v1';

const TIPO_MAP = {
  carro: 'carros',
  moto: 'motos',
  caminhao: 'caminhoes',
};

class FipeService {
  constructor() {
    this.axios = axios.create({
      baseURL: FIPE_BASE_URL,
      timeout: 10000,
    });
  }

  async buscarPreco(tipo, marcaNome, modeloNome, ano) {
    const tipoFipe = TIPO_MAP[tipo] || 'carros';
    const cacheKey = `fipe:${tipoFipe}:${marcaNome}:${modeloNome}:${ano}`.toLowerCase();

    const cached = cache.get(cacheKey);
    if (cached) {
      logger.debug(`FIPE cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      // 1. Busca marcas
      const marcas = await this.axios.get(`/${tipoFipe}/brands`);
      const marca = marcas.data.find(m =>
        m.name.toLowerCase().includes(marcaNome.toLowerCase())
      );
      if (!marca) throw new Error(`Marca não encontrada: ${marcaNome}`);

      // 2. Busca modelos
      const modelos = await this.axios.get(`/${tipoFipe}/brands/${marca.code}/models`);
      const modelo = modelos.data.models.find(m =>
        m.name.toLowerCase().includes(modeloNome.toLowerCase())
      );
      if (!modelo) throw new Error(`Modelo não encontrado: ${modeloNome}`);

      // 3. Busca anos
      const anos = await this.axios.get(
        `/${tipoFipe}/brands/${marca.code}/models/${modelo.code}/years`
      );
      const anoCode = anos.data.find(a => a.name.includes(String(ano)));
      if (!anoCode) throw new Error(`Ano não encontrado: ${ano}`);

      // 4. Busca preço final
      const precoData = await this.axios.get(
        `/${tipoFipe}/brands/${marca.code}/models/${modelo.code}/years/${anoCode.code}`
      );

      const preco = parseFloat(
        precoData.data.price
          .replace('R$ ', '')
          .replace(/\./g, '')
          .replace(',', '.')
      );

      const result = {
        preco,
        mesReferencia: precoData.data.referenceMonth,
        codigoFipe: precoData.data.codeFipe,
        combustivel: precoData.data.fuel,
        atualizadoEm: new Date(),
      };

      cache.set(cacheKey, result);
      logger.info(`FIPE consultado: ${marcaNome} ${modeloNome} ${ano} = R$ ${preco}`);
      return result;
    } catch (error) {
      logger.error('FIPE API Error:', error.message);
      throw new Error(`Não foi possível consultar a tabela FIPE: ${error.message}`);
    }
  }

  async buscaRapida(tipo, marca, modelo, ano) {
    return this.buscarPreco(tipo, marca, modelo, ano);
  }
}

module.exports = new FipeService();
