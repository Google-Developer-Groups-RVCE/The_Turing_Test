const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
let k8sApi;
let k8sAppsApi;
const NAMESPACE = 'turing-test';

import('@kubernetes/client-node').then((k8s) => {
  const kc = new k8s.KubeConfig();
  try {
    kc.loadFromDefault();
  } catch (e) {
    console.error("KubeConfig load error:", e.message);
  }
  k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
}).catch(console.error);

router.get('/api/v1/namespaces/websocket-app/pods', async (req, res) => {
    try { const r = await k8sApi.listNamespacedPod(NAMESPACE); res.json(r.body); } catch(e) { res.status(500).json({error: e.message}); }
});
router.get('/apis/apps/v1/namespaces/websocket-app/deployments', async (req, res) => {
    try { const r = await k8sAppsApi.listNamespacedDeployment(NAMESPACE); res.json(r.body); } catch(e) { res.status(500).json({error: e.message}); }
});
router.get('/api/v1/namespaces/websocket-app/services', async (req, res) => {
    try { const r = await k8sApi.listNamespacedService(NAMESPACE); res.json(r.body); } catch(e) { res.status(500).json({error: e.message}); }
});
router.get('/api/v1/namespaces/websocket-app/configmaps', async (req, res) => {
    try { const r = await k8sApi.listNamespacedConfigMap(NAMESPACE); res.json(r.body); } catch(e) { res.status(500).json({error: e.message}); }
});
router.get('/api/v1/namespaces/websocket-app/events', async (req, res) => {
    try { const r = await k8sApi.listNamespacedEvent(NAMESPACE); res.json(r.body); } catch(e) { res.status(500).json({error: e.message}); }
});
router.get('/api/v1/nodes', async (req, res) => {
    try { const r = await k8sApi.listNode(); res.json(r.body); } catch(e) { res.status(500).json({error: e.message}); }
});
router.get('/apis/metrics.k8s.io/v1beta1/namespaces/websocket-app/pods', async (req, res) => {
    try {
        res.send(execSync(`kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/${NAMESPACE}/pods`).toString());
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.get('/raw/:type/:name/:action', async (req, res) => {
    try {
        const { type, name, action } = req.params;
        let result = '';
        if (action === 'yaml') {
            result = execSync(`kubectl get ${type} ${name} -n ${NAMESPACE} -o yaml`).toString();
        } else if (action === 'describe') {
            result = execSync(`kubectl describe ${type} ${name} -n ${NAMESPACE}`).toString();
        } else if (action === 'logs') {
              try {
                  result = execSync(`kubectl logs ${type === 'pods' ? name : `${type}/${name}`} -n ${NAMESPACE} --tail=200`).toString();
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

router.delete('/api/v1/namespaces/websocket-app/pods/:name', (req, res) => {
    try {
        execSync(`kubectl delete pod ${req.params.name} -n ${NAMESPACE}`);
        res.json({ status: 'ok' });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.patch('/apis/apps/v1/namespaces/websocket-app/deployments/:name', express.json({type: '*/*'}), (req, res) => {
    try {
        const patchStr = JSON.stringify(req.body).replace(/"/g, '\\"');
        execSync(`kubectl patch deployment ${req.params.name} -n ${NAMESPACE} -p "${patchStr}"`);
        res.json({ status: 'ok' });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.post('/apis/chaos-mesh.org/v1alpha1/namespaces/websocket-app/networkchaos', express.json(), (req, res) => {
    try {
        const fs = require('fs');
        fs.writeFileSync('/tmp/chaos.json', JSON.stringify(req.body));
        execSync(`kubectl apply -f /tmp/chaos.json`);
        res.json({ status: 'ok' });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.get('/apis/chaos-mesh.org/v1alpha1/namespaces/websocket-app/networkchaos/network-delay', (req, res) => {
    try {
        const out = execSync(`kubectl get networkchaos network-delay -n ${NAMESPACE} -o json`).toString();
        res.json(JSON.parse(out));
    } catch(e) { res.status(404).json({error: 'Not found'}); }
});

router.get('/connections/live', async (req, res) => {
    const { redisClient } = require('../config/redisClient');
    try {
        const participants = await redisClient.smembers('presence:participants');
        const admins = await redisClient.smembers('presence:admins');
        res.json({
            count: participants.length + admins.length,
            details: [...participants.map(p => ({id: p, user: p})), ...admins.map(a => ({id: a, user: a}))]
        });
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.get('/admin/redis/topology', (req, res) => {
    try {
        res.json({ status: 'mocked' }); // Full topology parsing is complex, skipping for brevity
    } catch(e) { res.status(500).json({error: e.message}); }
});

router.post('/admin/redis/failover', (req, res) => {
    try {
        res.json({ status: 'mocked' }); // Mocked failover
    } catch(e) { res.status(500).json({error: e.message}); }
});

module.exports = router;
