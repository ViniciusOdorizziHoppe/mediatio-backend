const success = (data, meta = {}) => ({
  success: true,
  data,
  ...meta,
  timestamp: new Date().toISOString()
});

const error = (message, details = null) => ({
  success: false,
  error: message,
  ...(details && { details }),
  timestamp: new Date().toISOString()
});

module.exports = {
  success,
  error
};