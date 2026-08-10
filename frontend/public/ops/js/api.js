// App API Base points to our node app
window.APP_BASE = (location.protocol === 'file:') ? 'http://localhost:8085/api' : `${location.origin}/api`;
// K8s API Base points to our Node proxy to bypass CORS
window.K8S_BASE = window.APP_BASE + '/k8s';

async function fetchK8sResource(resource) {
  // Translate resource names to Kubernetes API paths
  let path = '';
  if (resource === 'pods') path = '/api/v1/namespaces/turing-test/pods';
  else if (resource === 'deployments') path = '/apis/apps/v1/namespaces/turing-test/deployments';
  else if (resource === 'services') path = '/api/v1/namespaces/turing-test/services';
  else if (resource === 'nodes') path = '/api/v1/nodes';
  else if (resource === 'events') path = '/api/v1/namespaces/turing-test/events';
  else if (resource === 'configmaps') path = '/api/v1/namespaces/turing-test/configmaps';
  else throw new Error('Unsupported resource ' + resource);
  
  const res = await fetch(`${window.K8S_BASE}${path}`);
  if (!res.ok) throw new Error('Failed to fetch ' + resource);
  const data = await res.json();
  return data.items || [];
}

async function triggerOperation(action, type, name, scale) {
  let url = '';
  let method = '';
  let body = null;
  let headers = {};

  if (action === 'delete_pod') {
    url = `${window.K8S_BASE}/api/v1/namespaces/turing-test/pods/${name}`;
    method = 'DELETE';
  } else if (action === 'scale') {
    url = `${window.K8S_BASE}/apis/apps/v1/namespaces/turing-test/deployments/${name}`;
    method = 'PATCH';
    headers = { 'Content-Type': 'application/strategic-merge-patch+json' };
    body = JSON.stringify({ spec: { replicas: parseInt(scale, 10) } });
  } else if (action === 'restart') {
    url = `${window.K8S_BASE}/apis/apps/v1/namespaces/turing-test/deployments/${name}`;
    method = 'PATCH';
    headers = { 'Content-Type': 'application/strategic-merge-patch+json' };
    body = JSON.stringify({
      spec: {
        template: {
          metadata: {
            annotations: {
              "kubectl.kubernetes.io/restartedAt": new Date().toISOString()
            }
          }
        }
      }
    });
  } else {
    throw new Error('Unknown action');
  }

  const res = await fetch(url, { method, headers, body });
  if (!res.ok) throw new Error('Operation failed');
  return res.json();
}

async function fetchRedisTopology() {
  const res = await fetch(`${window.APP_BASE}/admin/redis/topology`);
  if (!res.ok) throw new Error('Failed to fetch topology');
  return res.json();
}

async function triggerRedisFailover() {
  const res = await fetch(`${window.APP_BASE}/admin/redis/failover`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to failover');
  return res.json();
}

// Chaos logic remains as is, but we can POST directly to K8s for NetworkChaos!
async function applyNetworkChaos(delay, loss) {
  const crd = {
    apiVersion: 'chaos-mesh.org/v1alpha1',
    kind: 'NetworkChaos',
    metadata: {
      name: 'network-delay',
      namespace: 'turing-test'
    },
    spec: {
      action: 'delay',
      mode: 'all',
      selector: {
        labelSelectors: { app: 'backend' }
      },
      delay: { latency: `${delay}ms`, correlation: '0', jitter: '0ms' },
      duration: '30s'
    }
  };
  
  const res = await fetch(`${window.K8S_BASE}/apis/chaos-mesh.org/v1alpha1/namespaces/turing-test/networkchaos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(crd)
  });
  if (!res.ok && res.status !== 409) throw new Error('Failed to apply chaos');
  return { status: 'ok' };
}

async function fetchChaosStatus() {
  // Try to GET the network chaos object
  const res = await fetch(`${window.K8S_BASE}/apis/chaos-mesh.org/v1alpha1/namespaces/turing-test/networkchaos/network-delay`);
  if (res.status === 404) return { mode: 'OFF', delay: '0', loss: '0', cpu: '0', mem: '0' };
  return { mode: 'ON (Network)', delay: 'active', loss: '0', cpu: '0', mem: '0' };
}
