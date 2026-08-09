'use strict';

const express = require('express');
const ngrok = require('ngrok');

const router = express.Router();

let currentUrl = null;

// GET /api/ngrok/status
router.get('/status', async (req, res) => {
  try {
    if (currentUrl) {
      res.json({ status: 'online', url: currentUrl });
    } else {
      res.json({ status: 'offline', url: null });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ngrok/start
router.post('/start', async (req, res) => {
  try {
    const { authtoken, target } = req.body;
    
    // Default target for docker-compose is http://frontend:80
    // But allow override if running locally (e.g. http://localhost:5173)
    const targetUrl = target || 'http://frontend:80';

    if (authtoken) {
      await ngrok.authtoken(authtoken);
    }

    if (!currentUrl) {
      currentUrl = await ngrok.connect({
        addr: targetUrl,
        bind_tls: true,
      });
    }
    
    res.json({ success: true, url: currentUrl, status: 'online' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ngrok/stop
router.post('/stop', async (req, res) => {
  try {
    await ngrok.kill();
    currentUrl = null;
    res.json({ success: true, status: 'offline' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
