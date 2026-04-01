const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../../../config/logger');

class FipeService {
  constructor() {
    this.baseURL = 'https://parallelum.com.br/fipe/api/v2';
    this.cache = new NodeCache({ stdTTL: 86400 }); // 24 horas
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 10000
    });
  }
  
  async buscarPreco(tipo, marcaNome, modeloNome, ano) {
    const cacheKey = `fipe_${tipo}_${marcaNome}_${modeloNome}_${ano}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      // 1. Busca tipo (motos, carros)
      const tipos = await this.axios.get('/vehicles/types');
      const tipoId = tipos.data.find(t => t.toLowerCase() === tipo.toLowerCase());
      if (!tipoId) throw new Error('Tipo não encontrado');
      
      // 2. Busca marcas
      const marcas = await this.axios.get(`/vehicles/${tipoId}/brands`);
      const marca = marcas.data.find(m => 
        m.name.toLowerCase().includes(marcaNome.toLowerCase())
      );
      if (!marca) throw new Error('Marca não encontrada');
      
      // 3. Busca modelos
      const modelos = await this.axios.get(`/vehicles/${tipoId}/brands/${marca.code}/models`);
      const modelo = modelos.data.find(m => 
        m.name.toLowerCase().includes(modeloNome.toLowerCase())
      );
      if (!modelo) throw new Error('Modelo não encontrado');
      
      // 4. Busca anos
      const anos = await this.axios.get(
        `/vehicles/${tipoId}/brands/${marca.code}/models/${modelo.code}/years`
      );
      const anoCode = anos.data.find(a => a.name.includes(String(ano)));
      if (!anoCode) throw new Error('Ano não encontrado');
      
      // 5. Busca preço final
      const precoData = await this.axios.get(
        `/vehicles/${tipoId}/brands/${marca.code}/models/${modelo.code}/years/${anoCode.code}`
      );
      
      const result = {
        preco: parseFloat(precoData.data.price.replace('R$ ', '').replace('.', '').replace(',', '.')),
        mesReferencia: precoData.data.referenceMonth,
        codigoFipe: precoData.data.codeFipe,
        combustivel: precoData.data.fuel,
        atualizadoEm: new Date()
      };
      
      this.cache.set(cacheKey, result);
      return result;
      
    } catch (error) {
      logger.error('FIPE API Error:', error.message);
      throw new Error('Não foi possível consultar a tabela FIPE');
    }
  }
  
  async buscaRapida(tipo, marca, modelo, ano) {
    // Método simplificado que tenta match direto
    return this.buscarPreco(tipo, marca, modelo, ano);
  }
}

module.exports = new FipeService();