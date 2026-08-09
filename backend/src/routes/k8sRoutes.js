'use strict';

const express = require('express');
const { execSync } = require('child_process');
const router = express.Router();

const NAMESPACE = 'turing-test';

// Helper: run kubectl command safely
function kubectl(cmd) {
  try {
    return { ok: true, data: execSync(`kubectl ${cmd} -n ${NAMESPACE}`, { timeout: 8000 }).toString() };
  } catch (e) {
    return { ok: false, error: e.stderr ? e.stderr.toString() : e.message };
  }
}

// GET /api/k8s/pods
router.get('/pods', (req, res) => {
  const result = kubectl('get pods -o json');
  if (!result.ok) return res.status(500).json({ error: result.error });
  try { res.json(JSON.parse(result.data)); } catch { res.json({ raw: result.data }); }
});

// GET /api/k8s/deployments
router.get('/deployments', (req, res) => {
  const result = kubectl('get deployments -o json');
  if (!result.ok) return res.status(500).json({ error: result.error });
  try { res.json(JSON.parse(result.data)); } catch { res.json({ raw: result.data }); }
});

// GET /api/k8s/services
router.get('/services', (req, res) => {
  const result = kubectl('get services -o json');
  if (!result.ok) return res.status(500).json({ error: result.error });
  try { res.json(JSON.parse(result.data)); } catch { res.json({ raw: result.data }); }
});

// GET /api/k8s/nodes
router.get('/nodes', (req, res) => {
  try {
    const data = execSync('kubectl get nodes -o json', { timeout: 8000 }).toString();
    res.json(JSON.parse(data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/k8s/events
router.get('/events', (req, res) => {
  const result = kubectl('get events -o json --sort-by=.lastTimestamp');
  if (!result.ok) return res.status(500).json({ error: result.error });
  try { res.json(JSON.parse(result.data)); } catch { res.json({ raw: result.data }); }
});

// GET /api/k8s/raw/:type/:name/:action  (yaml, describe, logs)
router.get('/raw/:type/:name/:action', (req, res) => {
  const { type, name, action } = req.params;
  // Sanitize inputs — only allow alphanumeric, dash, underscore, dot
  if (!/^[\w.-]+$/.test(type) || !/^[\w.-]+$/.test(name) || !/^[\w.-]+$/.test(action)) {
    return res.status(400).send('Invalid parameters');
  }
  let cmd;
  if (action === 'yaml') cmd = `get ${type} ${name} -o yaml`;
  else if (action === 'describe') cmd = `describe ${type} ${name}`;
  else if (action === 'logs') cmd = `logs ${name} --tail=200`;
  else return res.status(400).send('Invalid action');
  const result = kubectl(cmd);
  res.type('text/plain').send(result.ok ? result.data : result.error);
});

// DELETE /api/k8s/pods/:name
router.delete('/pods/:name', (req, res) => {
  const { name } = req.params;
  if (!/^[\w.-]+$/.test(name)) return res.status(400).json({ error: 'Invalid pod name' });
  const result = kubectl(`delete pod ${name}`);
  if (!result.ok) return res.status(500).json({ error: result.error });
  res.json({ status: 'ok', message: result.data });
});

// POST /api/k8s/deployments/:name/restart
router.post('/deployments/:name/restart', (req, res) => {
  const { name } = req.params;
  if (!/^[\w.-]+$/.test(name)) return res.status(400).json({ error: 'Invalid deployment name' });
  const result = kubectl(`rollout restart deployment/${name}`);
  if (!result.ok) return res.status(500).json({ error: result.error });
  res.json({ status: 'ok', message: result.data });
});

// GET /api/k8s/connections/live — live presence from Redis
router.get('/connections/live', async (req, res) => {
  const { redisClient } = require('../config/redisClient');
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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/k8s/redis/topology
router.get('/redis/topology', (req, res) => {
  try {
    const result = kubectl('get pods -l app=redis -o json');
    res.json({ status: result.ok ? 'ok' : 'error', raw: result.ok ? JSON.parse(result.data) : result.error });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// These old paths (used by ops.html frontend) — redirect to new paths
// Keep for backward compat
router.get('/api/v1/namespaces/websocket-app/pods', (req, res) => {
  const result = kubectl('get pods -o json');
  if (!result.ok) return res.status(500).json({ error: result.error });
  try { res.json(JSON.parse(result.data)); } catch { res.json({}); }
});

router.get('/apis/apps/v1/namespaces/websocket-app/deployments', (req, res) => {
  const result = kubectl('get deployments -o json');
  if (!result.ok) return res.status(500).json({ error: result.error });
  try { res.json(JSON.parse(result.data)); } catch { res.json({}); }
});

router.get('/api/v1/namespaces/websocket-app/services', (req, res) => {
  const result = kubectl('get services -o json');
  if (!result.ok) return res.status(500).json({ error: result.error });
  try { res.json(JSON.parse(result.data)); } catch { res.json({}); }
});

router.get('/api/v1/nodes', (req, res) => {
  try {
    const data = execSync('kubectl get nodes -o json', { timeout: 8000 }).toString();
    res.json(JSON.parse(data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/apis/metrics.k8s.io/v1beta1/namespaces/websocket-app/pods', (req, res) => {
  const result = kubectl('top pods --no-headers');
  if (!result.ok) return res.status(500).json({ error: result.error });
  res.type('text/plain').send(result.data);
});

router.get('/admin/redis/topology', (req, res) => {
  res.json({ status: 'ok', nodes: [{ id: 'redis-0', role: 'master', host: 'redis-service', port: 6379 }] });
});

router.post('/admin/redis/failover', (req, res) => {
  res.json({ status: 'ok', message: 'Single-node Redis - no failover needed' });
});

module.exports = router;
