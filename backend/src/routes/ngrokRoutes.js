'use strict';

const express = require('express');
const { spawn } = require('child_process');
const http = require('http');

const router = express.Router();

let ngrokProcess = null;
let currentUrl = null;

const DEFAULT_AUTHTOKEN = process.env.NGROK_AUTHTOKEN || '36tFxCc1jtMj815lmQkNtd3Q0Ak_32HSVw9KNxX3bLt5xmG7Z';
const DEFAULT_DOMAIN = 'nondefensible-helminthological-tennie.ngrok-free.dev';

/**
 * Poll ngrok's local API at localhost (ports 4040, 4041, 4042) to get active tunnel URL.
 */
function getNgrokUrl(retries = 10) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryFetch = () => {
      const ports = [4040, 4041, 4042];
      let checked = 0;
      let found = false;

      ports.forEach(port => {
        const req = http.get(`http://127.0.0.1:${port}/api/tunnels`, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              const httpsUrl = parsed.tunnels?.find(t => t.proto === 'https')?.public_url || parsed.tunnels?.[0]?.public_url;
              if (httpsUrl && !found) {
                found = true;
                return resolve(httpsUrl);
              }
            } catch {}
            checked++;
            if (checked === ports.length && !found) retry();
          });
        });
        req.on('error', () => {
          checked++;
          if (checked === ports.length && !found) retry();
        });
      });
    };

    const retry = () => {
      attempts++;
      if (attempts >= retries) return reject(new Error('Could not get ngrok URL after ' + retries + ' attempts'));
      setTimeout(tryFetch, 1500);
    };

    tryFetch();
  });
}

// GET /api/ngrok/status
router.get('/status', async (req, res) => {
  try {
    if (ngrokProcess && currentUrl) {
      return res.json({ status: 'online', url: currentUrl });
    }
    try {
      const url = await getNgrokUrl(1);
      currentUrl = url;
      return res.json({ status: 'online', url: currentUrl });
    } catch {
      res.json({ status: 'offline', url: null });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ngrok/start
router.post('/start', async (req, res) => {
  try {
    if (ngrokProcess) {
      return res.json({ success: true, url: currentUrl, status: 'online', message: 'Already running' });
    }

    const target = req.body?.port ? `http://127.0.0.1:${req.body.port}` : (req.body?.target || 'http://127.0.0.1:80');
    const domain = req.body?.domain || DEFAULT_DOMAIN;
    const authtoken = process.env.NGROK_AUTHTOKEN || DEFAULT_AUTHTOKEN;

    const args = ['ngrok', 'http', target, `--authtoken=${authtoken}`, `--url=${domain}`, '--log=stdout'];

    // Spawn npx ngrok
    ngrokProcess = spawn('npx', args, {
      shell: true,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    ngrokProcess.on('exit', (code) => {
      ngrokProcess = null;
      currentUrl = null;
    });

    ngrokProcess.stderr.on('data', (data) => {
      console.error('[ngrok]', data.toString());
    });

    try {
      currentUrl = await getNgrokUrl(12);
      res.json({ success: true, url: currentUrl, status: 'online' });
    } catch (err) {
      if (ngrokProcess) { ngrokProcess.kill(); ngrokProcess = null; }
      res.status(500).json({ error: 'ngrok started but could not get public URL. Check authtoken and domain.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ngrok/stop
router.post('/stop', async (req, res) => {
  try {
    if (ngrokProcess) {
      ngrokProcess.kill();
      ngrokProcess = null;
    }
    currentUrl = null;
    res.json({ success: true, status: 'offline' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
