const User = require('../../modules/auth/auth.model');
const logger = require('../../config/logger');

let cachedBotUserId = null;

/**
 * Resolve o userId do bot para um ObjectId válido do MongoDB.
 * Procura o primeiro admin ativo; se não existir, cria um usuário sistema.
 * O resultado é cacheado em memória para evitar queries repetidas.
 */
async function resolveBotUserId() {
  if (cachedBotUserId) return cachedBotUserId;

  try {
    let user = await User.findOne({ role: 'admin', active: true });

    if (!user) {
      user = await User.findOne({ active: true });
    }

    if (!user) {
      user = await User.create({
        name: 'Mediatio Bot',
        email: 'bot@mediatio.system',
        password: 'BotSystem2026!SecureGenerated',
        role: 'admin',
        active: true,
      });
      logger.info('Usuário sistema do bot criado: bot@mediatio.system');
    }

    cachedBotUserId = user._id.toString();
    logger.info(`Bot userId resolvido: ${cachedBotUserId}`);
    return cachedBotUserId;
  } catch (err) {
    logger.error('Falha ao resolver bot userId:', err);
    throw err;
  }
}

module.exports = { resolveBotUserId };
