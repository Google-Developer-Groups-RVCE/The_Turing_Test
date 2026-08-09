'use strict';

const express = require('express');
const k8s = require('@kubernetes/client-node');
const { execSync } = require('child_process');
const { redisClient } = require('../config/redisClient');
const Redis = require('ioredis');

const router = express.Router();

// ── Kubernetes Client ────────────────────────────────────────────────────────
const kc = new k8s.KubeConfig();
if (process.env.KUBERNETES_SERVICE_HOST) {
  kc.loadFromCluster();
} else {
  kc.loadFromDefault();
}
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);

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

// Proxy routes for Kubernetes
const ns = 'turing-test';

router.get('/k8s/api/v1/namespaces/websocket-app/pods', async (req, res) => {
  try { const r = await k8sApi.listNamespacedPod(ns); res.json(r.body); } catch(e) { res.status(500).json({error: e.message}); }
});
router.get('/k8s/apis/apps/v1/namespaces/websocket-app/deployments', async (req, res) => {
  try { const r = await k8sAppsApi.listNamespacedDeployment(ns); res.json(r.body); } catch(e) { res.status(500).json({error: e.message}); }
});
router.get('/k8s/api/v1/namespaces/websocket-app/services', async (req, res) => {
  try { const r = await k8sApi.listNamespacedService(ns); res.json(r.body); } catch(e) { res.status(500).json({error: e.message}); }
});
router.get('/k8s/api/v1/namespaces/websocket-app/configmaps', async (req, res) => {
  try { const r = await k8sApi.listNamespacedConfigMap(ns); res.json(r.body); } catch(e) { res.status(500).json({error: e.message}); }
});
router.get('/k8s/api/v1/namespaces/websocket-app/events', async (req, res) => {
  try { const r = await k8sApi.listNamespacedEvent(ns); res.json(r.body); } catch(e) { res.status(500).json({error: e.message}); }
});
router.get('/k8s/api/v1/nodes', async (req, res) => {
  try { const r = await k8sApi.listNode(); res.json(r.body); } catch(e) { res.status(500).json({error: e.message}); }
});
router.get('/k8s/apis/metrics.k8s.io/v1beta1/namespaces/websocket-app/pods', async (req, res) => {
  try {
      res.send(execSync(`kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/${ns}/pods`).toString());
  } catch(e) { res.status(500).json({error: e.message}); }
});

router.get('/k8s/raw/:type/:name/:action', async (req, res) => {
  try {
      const { type, name, action } = req.params;
      let result = '';
      if (action === 'yaml') {
          result = execSync(`kubectl get ${type} ${name} -n ${ns} -o yaml`).toString();
      } else if (action === 'describe') {
          result = execSync(`kubectl describe ${type} ${name} -n ${ns}`).toString();
      } else if (action === 'logs') {
          try {
              result = execSync(`kubectl logs ${type === 'pods' ? name : `${type}/${name}`} -n ${ns} --tail=200`).toString();
          } catch (e) {
              result = e.stderr ? e.stderr.toString() : e.message;
          }
      } else {
          return res.status(400).send('Invalid action');
      }
      res.type('text/plain').send(result);
  } catch(err) {
      res.status(500).send(err.message || 'Error executing kubectl');
  }
});

// Redis Topology Mock (using current primary instance as we don't have sentinels in turing-test yet)
router.get('/admin/redis/topology', (req, res) => {
  res.json({
    primary: 'redis-0',
    replica: 'Unknown',
    status: 'ok',
    leader: 'Unknown',
    sentinels: 0,
    latency: 0,
    failovers: 0,
    lastChange: Date.now(),
    podStats: {}
  });
});

module.exports = router;
