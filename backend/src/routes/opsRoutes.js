'use strict';

const express = require('express');
const { execSync } = require('child_process');
const { redisClient } = require('../config/redisClient');
const Redis = require('ioredis');

const router = express.Router();

// ── Kubernetes Client ────────────────────────────────────────────────────────
let k8sApi, k8sAppsApi;

async function getK8sClients() {
  if (k8sApi && k8sAppsApi) return { k8sApi, k8sAppsApi };
  const k8s = await import('@kubernetes/client-node');
  const kc = new k8s.KubeConfig();
  if (process.env.KUBERNETES_SERVICE_HOST) {
    kc.loadFromCluster();
  } else {
    kc.loadFromDefault();
  }
  k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
  return { k8sApi, k8sAppsApi };
}

// ── Ops Center Enhanced APIs ────────────────────────────────────────────────────────

router.post('/connections/kill', async (req, res) => {
  try {
    const { connectionIds } = req.body;
    if (!connectionIds || !Array.isArray(connectionIds)) {
      return res.status(400).json({ error: 'connectionIds array is required' });
    }
    await redisClient.publish('admin_events', JSON.stringify({ type: 'KILL_CONNECTIONS', connectionIds }));
    res.json({ success: true, message: `Kill signal sent for ${connectionIds.length} connections` });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/blocked', async (req, res) => {
  try {
    const blocked = await redisClient.smembers('blocked_users');
    res.json(blocked);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/block', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    await redisClient.sadd('blocked_users', username);
    await redisClient.publish('admin_events', JSON.stringify({ type: 'BLOCK_USER', username }));
    res.json({ success: true, message: `Blocked user ${username}` });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/unblock', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    await redisClient.srem('blocked_users', username);
    res.json({ success: true, message: `Unblocked user ${username}` });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const logs = await redisClient.lrange('admin_logs', -200, -1);
    const parsed = logs.map(l => { try { return JSON.parse(l); } catch(e) { return { rawText: l }; } });
    res.json(parsed.reverse());
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Alias used by ops.html
router.get('/admin/logs', async (req, res) => {
  try {
    const logs = await redisClient.lrange('admin_logs', -200, -1);
    const parsed = logs.map(l => { try { return JSON.parse(l); } catch(e) { return { rawText: l }; } });
    res.json(parsed.reverse());
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Live connections — also accessible at /api/connections/live
router.get('/connections/live', async (req, res) => {
  try {
    const participants = await redisClient.smembers('presence:participants');
    const admins = await redisClient.smembers('presence:admins');
    res.json({
      count: participants.length + admins.length,
      participants,
      admins,
      details: [
        ...participants.map(p => ({ id: p, user: p, role: 'participant' })),
        ...admins.map(a => ({ id: a, user: a, role: 'admin' }))
      ]
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy routes for Kubernetes — use kubectl CLI directly (avoids ESM issues with k8s client)
const ns = 'turing-test';
function kubectlExec(cmd) {
  try {
    return { ok: true, data: execSync(`kubectl ${cmd} -n ${ns}`, { timeout: 8000 }).toString() };
  } catch(e) {
    return { ok: false, error: e.stderr ? e.stderr.toString() : e.message };
  }
}

router.get('/k8s/api/v1/namespaces/websocket-app/pods', (req, res) => {
  const r = kubectlExec('get pods -o json');
  if (!r.ok) return res.status(500).json({ error: r.error });
  try { res.json(JSON.parse(r.data)); } catch { res.json({}); }
});
router.get('/k8s/apis/apps/v1/namespaces/websocket-app/deployments', (req, res) => {
  const r = kubectlExec('get deployments -o json');
  if (!r.ok) return res.status(500).json({ error: r.error });
  try { res.json(JSON.parse(r.data)); } catch { res.json({}); }
});
router.get('/k8s/api/v1/namespaces/websocket-app/services', (req, res) => {
  const r = kubectlExec('get services -o json');
  if (!r.ok) return res.status(500).json({ error: r.error });
  try { res.json(JSON.parse(r.data)); } catch { res.json({}); }
});
router.get('/k8s/api/v1/namespaces/websocket-app/configmaps', (req, res) => {
  const r = kubectlExec('get configmaps -o json');
  if (!r.ok) return res.status(500).json({ error: r.error });
  try { res.json(JSON.parse(r.data)); } catch { res.json({}); }
});
router.get('/k8s/api/v1/namespaces/websocket-app/events', (req, res) => {
  const r = kubectlExec('get events -o json');
  if (!r.ok) return res.status(500).json({ error: r.error });
  try { res.json(JSON.parse(r.data)); } catch { res.json({}); }
});
router.get('/k8s/api/v1/nodes', (req, res) => {
  try { const data = execSync('kubectl get nodes -o json', { timeout: 8000 }).toString(); res.json(JSON.parse(data)); }
  catch(e) { res.status(500).json({ error: e.message }); }
});
router.get('/k8s/apis/metrics.k8s.io/v1beta1/namespaces/websocket-app/pods', (req, res) => {
  const r = kubectlExec('top pods --no-headers');
  res.type('text/plain').send(r.ok ? r.data : r.error);
});

router.get('/k8s/raw/:type/:name/:action', (req, res) => {
  const { type, name, action } = req.params;
  if (!/^[\w.-]+$/.test(type) || !/^[\w.-]+$/.test(name) || !/^[\w.-]+$/.test(action)) {
    return res.status(400).send('Invalid parameters');
  }
  let cmd;
  if (action === 'yaml') cmd = `get ${type} ${name} -o yaml`;
  else if (action === 'describe') cmd = `describe ${type} ${name}`;
  else if (action === 'logs') cmd = `logs ${name} --tail=200`;
  else return res.status(400).send('Invalid action');
  const r = kubectlExec(cmd);
  res.type('text/plain').send(r.ok ? r.data : r.error);
});

router.get('/admin/redis/topology', (req, res) => {
  res.json({
    primary: 'redis-0', replica: 'None', status: 'ok',
    leader: 'redis-0', sentinels: 0, latency: 0,
    failovers: 0, lastChange: Date.now(), podStats: {}
  });
});

module.exports = router;
