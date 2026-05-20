const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authMiddleware } = require('../../shared/middlewares/auth.middleware');
const { success } = require('../../shared/utils/api-response');
const logger = require('../../config/logger');

const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || '2363581774108380';
const BASE_URL = 'https://graph.facebook.com/v22.0';

router.get('/insights', authMiddleware, async (req, res, next) => {
  try {
    const token = process.env.META_ADS_TOKEN || '';
    if (!token) {
      return res.json(success({ 
        error: 'META_ADS_TOKEN nao configurado no ambiente',
        ads: [], total: { impressions: 0, clicks: 0, spend: 0 }
      }));
    }

    const fields = 'ad_name,impressions,clicks,ctr,spend,reach';
    const since = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
    const until = new Date().toISOString().split('T')[0];
    
    const url = `${BASE_URL}/act_${AD_ACCOUNT_ID}/insights?access_token=${token}&fields=${fields}&time_range[since]=${since}&time_range[until]=${until}&level=ad&limit=50`;
    
    const response = await axios.get(url);
    const ads = response.data?.data || [];
    
    const total = ads.reduce((acc, ad) => ({
      impressions: acc.impressions + parseInt(ad.impressions || 0),
      clicks: acc.clicks + parseInt(ad.clicks || 0),
      spend: acc.spend + parseFloat(ad.spend || 0)
    }), { impressions: 0, clicks: 0, spend: 0 });

    const enriched = ads.map(ad => {
      const name = ad.ad_name || '';
      const vehicle = name.includes('[') ? name.split('[')[1].split(']')[0] : name;
      const ctr = parseFloat(ad.ctr || 0);
      const clicks = parseInt(ad.clicks || 0);
      const spend = parseFloat(ad.spend || 0);
      return {
        vehicle,
        impressions: parseInt(ad.impressions || 0), clicks, ctr, spend,
        cpc: clicks > 0 ? spend / clicks : 0,
        reach: parseInt(ad.reach || 0)
      };
    });

    res.json(success({ ads: enriched, total }));
  } catch (err) {
    logger.error('Meta Ads error:', err.message);
    res.json(success({ error: err.message, ads: [], total: { impressions: 0, clicks: 0, spend: 0 } }));
  }
});

module.exports = router;
