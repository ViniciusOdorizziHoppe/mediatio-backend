const axios = require('axios');
const logger = require('../../../config/logger');

class ZApiService {
  constructor() {
    this.baseUrl = 'https://api.z-api.io/instances';
    this.instanceId = process.env.ZAPI_INSTANCE;
    this.token = process.env.ZAPI_TOKEN;
    this.clientToken = process.env.ZAPI_CLIENT_TOKEN;
  }

  async sendMessage(phone, message) {
    try {
      if (!this.instanceId || !this.token) {
        throw new Error('Z-API: Instance ID ou Token não configurados');
      }

      const url = `${this.baseUrl}/${this.instanceId}/token/${this.token}/send-text`;
      
      const response = await axios.post(url, {
        phone: phone.replace(/\D/g, ''), // Limpa o número
        message: message
      }, {
        headers: {
          'Client-Token': this.clientToken,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`Z-API: Mensagem enviada para ${phone}`);
      return response.data;
    } catch (error) {
      logger.error(`Z-API Error: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  }

  /**
   * Envia botões ou listas (opcional, conforme necessidade do bot)
   */
  async sendButtons(phone, message, buttons) {
    try {
      const url = `${this.baseUrl}/${this.instanceId}/token/${this.token}/send-button-list`;
      const response = await axios.post(url, {
        phone: phone.replace(/\D/g, ''),
        message: message,
        buttons: buttons // Formato Z-API: [{id: '1', label: 'Sim'}, {id: '2', label: 'Não'}]
      }, {
        headers: {
          'Client-Token': this.clientToken
        }
      });
      return response.data;
    } catch (error) {
      logger.error(`Z-API Buttons Error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ZApiService();
