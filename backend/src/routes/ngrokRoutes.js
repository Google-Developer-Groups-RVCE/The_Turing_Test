'use strict';

const express = require('express');
const { spawn } = require('child_process');
const http = require('http');

const router = express.Router();

let ngrokProcess = null;
let currentUrl = null;

/**
 * Poll ngrok's local API at localhost:4040 to get the active tunnel URL.
 * Retries up to `retries` times with a 1-second delay between each.
 */
function getNgrokUrl(retries = 10) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryFetch = () => {
      const req = http.get('http://localhost:4040/api/tunnels', (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const httpsUrl = parsed.tunnels?.find(t => t.proto === 'https')?.public_url;
            if (httpsUrl) return resolve(httpsUrl);
          } catch {}
          retry();
        });
      });
      req.on('error', retry);
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
      res.json({ status: 'online', url: currentUrl });
    } else {
      // Try to detect an already-running ngrok
      try {
        const url = await getNgrokUrl(1);
        currentUrl = url;
        res.json({ status: 'online', url: currentUrl });
      } catch {
        res.json({ status: 'offline', url: null });
      }
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

    // The target to expose — the frontend service inside k8s is at turing-test.local
    // but from inside docker/k8s the frontend listens on port 80
    // From the host machine, turing-test.local maps to localhost via ingress
    const target = req.body?.port ? `http://localhost:${req.body.port}` : (req.body?.target || 'http://localhost:80');
    const domain = req.body?.domain;
    const authtoken = process.env.NGROK_AUTHTOKEN || '36tFxCc1jtMj815lmQkNtd3Q0Ak_32HSVw9KNxX3bLt5xmG7Z';

    const args = ['http', target, '--host-header=turing-test.local', '--log=stdout'];
    if (authtoken) args.push(`--authtoken=${authtoken}`);
    if (domain) args.push(`--url=${domain}`);

    // Spawn ngrok — it will automatically read ngrok.yml for the auth token
    ngrokProcess = spawn('ngrok', args, {
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

    // Wait for ngrok to start then fetch URL
    try {
      currentUrl = await getNgrokUrl(12);
      res.json({ success: true, url: currentUrl, status: 'online' });
    } catch (err) {
      // Kill the process if we can't get the URL
      if (ngrokProcess) { ngrokProcess.kill(); ngrokProcess = null; }
      res.status(500).json({ error: 'ngrok started but could not get public URL. Check ngrok is installed and authenticated.' });
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
