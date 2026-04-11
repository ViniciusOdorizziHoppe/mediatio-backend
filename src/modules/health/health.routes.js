const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'up',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

module.exports = router;
