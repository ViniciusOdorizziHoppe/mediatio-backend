/**
 * Padronização de respostas da API
 */

const success = (data, extra = {}) => ({
  success: true,
  data,
  ...extra,
});

const error = (message, details = null, statusCode = 400) => {
  const response = {
    success: false,
    error: message,
  };
  if (details) response.details = details;
  return response;
};

const paginated = (data, meta) => ({
  success: true,
  data,
  meta: {
    total: meta.total,
    page: meta.page,
    limit: meta.limit,
    totalPages: Math.ceil(meta.total / meta.limit),
  },
});

module.exports = { success, error, paginated };
