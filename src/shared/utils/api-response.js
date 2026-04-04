/**
 * Padronização de respostas da API
 */

const success = (data, extras = {}) => ({
  success: true,
  data,
  ...extras,
});

const error = (message, statusCode = 500, details = null) => ({
  success: false,
  error: message,
  ...(details && { details }),
});

const paginated = (data, meta) => ({
  success: true,
  data,
  meta,
});

module.exports = { success, error, paginated };
