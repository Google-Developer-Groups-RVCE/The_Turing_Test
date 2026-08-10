let legacyLoaded = false;
let pollingEnabled = true;

window.togglePolling = function() {
  pollingEnabled = !pollingEnabled;
  const btn = document.getElementById('btn-toggle-polling');
  if (btn) {
    btn.textContent = pollingEnabled ? '⏸ Pause Polling' : '▶ Resume Polling';
    btn.style.background = pollingEnabled ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)';
    btn.style.borderColor = pollingEnabled ? '#3b82f6' : '#ef4444';
    btn.style.color = pollingEnabled ? '#3b82f6' : '#ef4444';
  }
  const badge = document.getElementById('polling-status-badge');
  if (badge) {
    badge.textContent = pollingEnabled ? 'LIVE' : 'PAUSED';
    badge.style.background = pollingEnabled ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)';
    badge.style.color = pollingEnabled ? '#10b981' : '#ef4444';
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const savedName = localStorage.getItem("adminName");
  if (savedName) {
    const input = document.getElementById("admin-name");
    if (input) input.value = savedName;
  }
});

window.toggleFilter = function (id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.toggle("active");
    // Change style based on active state
    if (el.classList.contains("active")) {
      el.style.background = "var(--color-primary)";
      el.style.color = "#fff";
      el.style.borderColor = "var(--color-primary)";
    } else {
      el.style.background = "var(--bg-dark)";
      el.style.color = "var(--text-muted)";
      el.style.borderColor = "var(--border-color)";
    }
    refreshData();
  }
};

function switchView(viewId) {
  document
    .querySelectorAll(".view-container")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((el) => el.classList.remove("active"));

  document.getElementById(`view-${viewId}`).classList.add("active");

  const navItem = document.querySelector(`.nav-item[onclick*="${viewId}"]`);
  if (navItem) navItem.classList.add("active");

  if (viewId === "dashboard") refreshData();
}

function showToast(title, message, isError = false) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText =
      "position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.style.cssText = `
        background: ${isError ? "var(--color-red, #dc3545)" : "var(--color-green, #28a745)"};
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        min-width: 250px;
        transform: translateX(120%);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        font-family: 'Inter', sans-serif;
    `;

  toast.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
        <div style="font-size: 0.9em; opacity: 0.9;">${message}</div>
    `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transform = "translateX(0)";
  }, 10);
  setTimeout(() => {
    toast.style.transform = "translateX(120%)";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

async function handleAction(action, type, name, val = "") {
  try {
    if (action === "chaos" || action === "clearchaos") {
      const delay =
        action === "chaos" ? document.getElementById("net-delay").value : 0;
      const loss =
        action === "chaos" ? document.getElementById("net-loss").value : 0;
      await applyNetworkChaos(delay, loss);
    } else if (action === "failover") {
      await triggerRedisFailover();
    } else {
      await wsTriggerOperation(action, type, name, val);
    }
    showToast("Success", `Action ${action} completed on ${name}`);
    refreshData();
  } catch (e) {
    showToast("Error", e.message, true);
  }
}

// Map of pending op resolvers keyed by op name
const _pendingOps = {};

async function wsTriggerOperation(action, type, name, val = "") {
  return new Promise((resolve, reject) => {
    if (wsApp.readyState !== WebSocket.OPEN)
      return reject(new Error("WebSocket is not connected"));
    const adminInput = document.getElementById("admin-name");
    const adminName = adminInput ? adminInput.value : "Admin";

    // Register pending callback BEFORE sending
    _pendingOps[action] = { resolve, reject };

    wsApp.send(
      JSON.stringify({
        type: "OPERATION",
        op: action,
        payload: { type, name, val, admin: adminName, podName: name },
      }),
    );

    // Timeout after 15s so we don't hang forever
    setTimeout(() => {
      if (_pendingOps[action]) {
        delete _pendingOps[action];
        reject(new Error(`Operation ${action} timed out after 15s — check server logs`));
      }
    }, 15000);
  });
}

async function applyPodControl(op) {
  const select = document.getElementById("target-app-pod");
  if (!select) return;
  const val = select.value;
  if (val === "all") {
    const options = Array.from(select.options).filter((o) => o.value !== "all");
    for (const opt of options) {
      handleAction(op, "pod", opt.value);
    }
  } else {
    handleAction(op, "pod", val);
  }
}

// ── WebSocket ──
const wsProto = location.protocol === "https:" ? "wss:" : "ws:";

// Connect to the App Server for Live Redis/Chat Events
const wsAppUrl =
  location.protocol === "file:"
    ? "ws://localhost:8085?admin=true"
    : `${wsProto}//${location.host}?admin=true`;
let wsApp = { send: () => {} };

function connectWs() {
  wsApp = new WebSocket(wsAppUrl);
  wsApp.onopen = () => wsApp.send(JSON.stringify({ type: "admin_join" }));
  wsApp.onclose = () => {
    console.log("ws closed, reconnecting...");
    setTimeout(connectWs, 2000);
  };
  wsApp.onmessage = (event) => {
    const data = JSON.parse(event.data);
      // Handle operation results from server
      if (data.type === "OP_SUCCESS") {
        const cb = _pendingOps[data.op];
        if (cb) { delete _pendingOps[data.op]; cb.resolve(data.message); }
        showToast("✅ Success", data.message || `${data.op} completed`);
        setTimeout(refreshData, 1500);
        return;
      }
      if (data.type === "OP_ERROR") {
        const cb = _pendingOps[data.op];
        if (cb) { delete _pendingOps[data.op]; cb.reject(new Error(data.error)); }
        showToast("❌ Operation Failed", data.error || `${data.op} failed`, true);
        return;
      }

      if (data.type === "ADMIN_EVENT") {
      const payload = data.payload || {};

      if (payload.count !== undefined) {
        if (document.getElementById("val-users"))
          document.getElementById("val-users").textContent = payload.count;
      }

      if (payload.type === "INFRA_UPDATE") {
        renderRedisStats(payload);
        if (payload.totalConnections !== undefined) {
          if (document.getElementById("val-conns"))
            document.getElementById("val-conns").textContent = payload.totalConnections;
        }
        // Don't add INFRA_UPDATE to live log viewer — it spams and causes auto-scroll
        return;
      }

      if (payload.type === "USER_JOINED") {
        addEventLog(`${payload.username} joined from pod ${payload.hostname} (took ${payload.latency}ms)`);
      } else if (payload.type === "USER_LEFT") {
        addEventLog(`${payload.username} left (was on ${payload.hostname})`);
      } else if (payload.type === "USER_INCREMENT") {
        addEventLog(`${payload.username} incremented to ${payload.newValue} from ${payload.hostname} (Redis: ${payload.redisLatency}ms, Total: ${payload.processingLatency}ms)`);
        const traceBtn = document.getElementById("btn-sim-req");
        if (traceBtn) traceBtn.classList.remove("pulse-btn");
      }

      // Trigger animation on increment
      if (payload.type === "USER_INCREMENT") {
        triggerTopologyPulse();
      }

      // Append to live log viewer (skip COUNT_UPDATE)
      const logViewer = document.getElementById("logViewer");
      if (logViewer && payload.type !== "COUNT_UPDATE") {
        const div = document.createElement("div");
        div.className = "log-line";
        const ts = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
        let msg = "";
        if (payload.type === "USER_JOINED") {
          msg = `[${payload.hostname}] ${payload.username || "Anonymous"} joined | Connections: ${payload.count} | Latency: ${payload.latency} ms`;
        } else if (payload.type === "USER_LEFT") {
          msg = `[${payload.hostname}] ${payload.username || "Anonymous"} left | Connections: ${payload.count}`;
        } else if (payload.type === "USER_INCREMENT") {
          msg = `[${payload.hostname}] Broadcast | Increment by ${payload.username || "Anonymous"} | Recipients: ${payload.recipients} | Latency: ${payload.latency} ms`;
        } else if (payload.type === "REDIS_FAILOVER") {
          msg = `[FAILOVER] Primary: ${payload.new_primary} | Completed in ${payload.duration_ms} ms`;
        } else if (payload.type === "SIMULATE_REQUEST") {
          msg = `[SIMULATION] Request ${payload.request_id} broadcast via Redis`;
        } else {
          msg = `[EVENT] ${JSON.stringify(payload)}`;
        }

        div.textContent = `[${ts}] ${msg}`;
        logViewer.appendChild(div);
        // Only auto-scroll if user is already at the bottom
        const threshold = 60;
        const atBottom = logViewer.scrollHeight - logViewer.scrollTop - logViewer.clientHeight < threshold;
        if (atBottom) logViewer.scrollTop = logViewer.scrollHeight;
      }
    }
  };
}
connectWs();

// ── Dashboard Data ──
async function refreshData() {
  try {
    const podsRaw = await fetchK8sResource("pods");
    const deploymentsRaw = await fetchK8sResource("deployments");

    let totalAppPods = 0;
    let readyPods = 0;

    const pods = podsRaw.map((p) => {
      if (p.metadata.labels && p.metadata.labels.app === "backend") {
        totalAppPods++;
        const readyCond =
          p.status.conditions &&
          p.status.conditions.find((c) => c.type === "Ready");
        if (readyCond && readyCond.status === "True") readyPods++;
      }
      return {
        name: p.metadata.name,
        phase:
          p.metadata.labels && p.metadata.labels.stopped === "true"
            ? "Stopped"
            : p.status.phase,
        podIP: p.status.podIP,
        restarts: p.status.containerStatuses
          ? p.status.containerStatuses.reduce(
              (acc, c) => acc + c.restartCount,
              0,
            )
          : 0,
        image: p.spec.containers[0].image,
      };
    });

    const deployments = deploymentsRaw.map((d) => ({
      name: d.metadata.name,
      replicas: d.spec.replicas,
      readyReplicas: d.status.readyReplicas,
    }));

    const health =
      readyPods === totalAppPods && totalAppPods > 0
        ? "HEALTHY"
        : readyPods > 0
          ? "DEGRADED"
          : "CRITICAL";
    if (document.getElementById("healthStatus")) {
      document.getElementById("healthStatus").textContent = health;
      document.getElementById("healthStatus").className =
        "badge " +
        (health === "HEALTHY"
          ? "green"
          : health === "DEGRADED"
            ? "yellow"
            : "red");
    }

    if (document.getElementById("val-pods"))
      document.getElementById("val-pods").textContent =
        `${readyPods} / ${totalAppPods}`;

    const appDep = deploymentsRaw.find(
      (d) => d.metadata.name === "backend",
    );
    if (appDep) {
      if (document.getElementById("val-hpa"))
        document.getElementById("val-hpa").textContent =
          `${appDep.spec.replicas || 0} Replicas`;
      const lastDeployTime =
        appDep.metadata.annotations &&
        appDep.metadata.annotations["deployment.kubernetes.io/revision"]
          ? appDep.metadata.annotations["deployment.kubernetes.io/revision"]
          : appDep.metadata.creationTimestamp;
      const isNum = !isNaN(lastDeployTime);
      if (document.getElementById("val-last-deploy"))
        document.getElementById("val-last-deploy").textContent = isNum
          ? `Revision ${lastDeployTime}`
          : new Date(lastDeployTime).toLocaleString();
    }

    // Fetch CPU/Memory if metrics-server is available
    try {
      const metricsRes = await fetch(
        `${window.K8S_BASE}/apis/metrics.k8s.io/v1beta1/namespaces/turing-test/pods`,
      );
      if (metricsRes.ok) {
        const metrics = await metricsRes.json();
        let totalCpuNanoCores = 0;
        let totalMemKiB = 0;
        metrics.items.forEach((pod) => {
          pod.containers.forEach((c) => {
            if (c.usage.cpu) {
              let cpu = c.usage.cpu;
              if (cpu.endsWith("n")) totalCpuNanoCores += parseInt(cpu);
              else if (cpu.endsWith("m"))
                totalCpuNanoCores += parseInt(cpu) * 1000000;
            }
            if (c.usage.memory) {
              let mem = c.usage.memory;
              if (mem.endsWith("Ki")) totalMemKiB += parseInt(mem);
              else if (mem.endsWith("Mi")) totalMemKiB += parseInt(mem) * 1024;
            }
          });
        });
        const cpuCores = (totalCpuNanoCores / 1e9).toFixed(2);
        const memMb = (totalMemKiB / 1024).toFixed(0);
        if (document.getElementById("val-cpu"))
          document.getElementById("val-cpu").textContent = `${cpuCores} Cores`;
        if (document.getElementById("val-mem"))
          document.getElementById("val-mem").textContent = `${memMb} MB`;
      }
    } catch (e) {
      if (document.getElementById("val-cpu"))
        document.getElementById("val-cpu").textContent = `N/A`;
      if (document.getElementById("val-mem"))
        document.getElementById("val-mem").textContent = `N/A`;
    }

    // Fetch Nodes
    try {
      const nodesRes = await fetch(`${window.K8S_BASE}/api/v1/nodes`);
      if (nodesRes.ok) {
        const nodes = await nodesRes.json();
        if (nodes && nodes.items) {
          if (document.getElementById("val-nodes"))
            document.getElementById("val-nodes").textContent =
              nodes.items.length;
        }
      }
    } catch (e) {}

    // Fetch Pods for App Pods grid and Topology
    const podsFetch = await fetchK8sResource("pods");
    if (podsFetch) {
      const appPods = podsFetch.filter(
        (p) => p.metadata.labels && p.metadata.labels.app === "backend",
      );
      const gridApp = document.getElementById("app-pod-cards");
      const gridRedis = document.getElementById("redis-pod-cards");
      const gridSentinel = document.getElementById("sentinel-pod-cards");
      const topoLayer = document.getElementById("topo-app-layer");
      const targetPodSelect = document.getElementById("target-app-pod");

      if (gridApp) gridApp.innerHTML = "";
      if (gridRedis) gridRedis.innerHTML = "";
      if (gridSentinel) gridSentinel.innerHTML = "";
      if (topoLayer) topoLayer.innerHTML = "";

      if (targetPodSelect) {
        const currentVal = targetPodSelect.value;
        targetPodSelect.innerHTML = '<option value="all">All App Pods</option>';
        appPods.forEach((p) => {
          targetPodSelect.innerHTML += `<option value="${p.metadata.name}">${p.metadata.name}</option>`;
        });
        targetPodSelect.value = Array.from(targetPodSelect.options).some(
          (o) => o.value === currentVal,
        )
          ? currentVal
          : "all";
      }

      podsFetch.forEach((p) => {
        const isTerminating = !!p.metadata.deletionTimestamp;
        const isReady =
          p.status.conditions &&
          p.status.conditions.some(
            (c) => c.type === "Ready" && c.status === "True",
          ) &&
          !isTerminating;
        const colorClass = isTerminating
          ? "gray"
          : isReady
            ? "green"
            : p.status.phase === "Running"
              ? "yellow"
              : "red";

        let targetGrid = null;
        if (
          p.metadata.name.startsWith("redis-primary") ||
          p.metadata.name.startsWith("redis-replica")
        )
          targetGrid = gridRedis;
        else if (p.metadata.name.startsWith("sentinel-"))
          targetGrid = gridSentinel;
        else targetGrid = gridApp;

        if (targetGrid) {
          targetGrid.innerHTML += `
                 <div class="stat-card ${colorClass}" style="padding: 10px;">
                   <div class="stat-title" style="font-size: 1rem;">${p.metadata.name}</div>
                   <div style="font-size: 0.85rem; margin-top:5px; line-height: 1.4;">
                     <div><strong>Node:</strong> ${p.spec.nodeName || "None"}</div>
                     <div><strong>IP:</strong> ${p.status.podIP || "Pending"}</div>
                     <div><strong>Status:</strong> ${isTerminating ? "Terminating" : p.status.phase}</div>
                   </div>
                 </div>
              `;
        }
      });

      appPods.forEach((p) => {
        const isTerminating = !!p.metadata.deletionTimestamp;
        const isReady =
          p.status.conditions &&
          p.status.conditions.some(
            (c) => c.type === "Ready" && c.status === "True",
          ) &&
          !isTerminating;
        const colorClass = isTerminating
          ? "gray"
          : isReady
            ? "green"
            : p.status.phase === "Running"
              ? "yellow"
              : "red";

        if (topoLayer) {
          topoLayer.innerHTML += `
                 <div class="arch-node ${colorClass}">
                    <div class="arch-title">${p.metadata.name.split("-").pop()}</div>
                    <div class="arch-meta">${p.status.podIP}</div>
                 </div>
              `;
        }
      });
    }
  } catch (err) {
    console.error("Failed to update dashboard data:", err);
  }

  // Update Chaos Mode mock status
  const panel = document.getElementById("chaos-status-panel");
  if (panel) {
    panel.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
           <div><strong>Mode:</strong> <span class="badge">OFF</span></div>
           <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
              <div><strong>Network Delay:</strong> 0 ms</div>
              <div><strong>Packet Loss:</strong> 0 %</div>
              <div><strong>CPU Stress:</strong> OFF</div>
              <div><strong>Memory Stress:</strong> OFF</div>
           </div>
        </div>
     `;
  }

  // Update Redis Topology
  try {
    const topo = await fetchRedisTopology();
    if (topo) {
      renderRedisStats(topo);
      updateRedisStatusBanner(topo);
    }
  } catch (err) {
    console.error("Failed to fetch Redis topology:", err);
  }
}
setInterval(() => { if (pollingEnabled) refreshData(); }, 5000);

async function renderRedisStats(topo) {
  try {
    const grid = document.getElementById("redis-overview-grid");
    if (!grid) return;

    const stats = topo.podStats || {
      'redis-primary-0': { role: 'Unknown', syncStatus: 'Unknown', health: 'Offline', memory: '0B' },
      'redis-replica-0': { role: 'Unknown', syncStatus: 'Unknown', health: 'Offline', memory: '0B' }
    };

    let html = '';
    for (const podName of ['redis-primary-0', 'redis-replica-0']) {
      const podInfo = stats[podName];
      const healthy = podInfo.health === 'Online';
      const color = healthy ? (podInfo.role === 'Primary' ? 'blue' : 'green') : 'red';
      
      html += `
        <div class="stat-card ${color}">
           <div class="stat-title">${podName}</div>
           <div class="stat-value" style="font-size: 1.2rem;">Role: ${podInfo.role}</div>
           <div style="font-size: 0.9rem; margin-top: 10px; color: var(--text-muted);">
              Health: <strong style="color: ${healthy ? '#10b981' : '#ef4444'};">${podInfo.health}</strong><br>
              Sync Status: ${podInfo.syncStatus}<br>
              Memory: ${podInfo.memory}<br>
              <br>
              <span style="font-size: 0.8rem; color: #6b7280;">Sentinel Leader: ${topo.sentinelLeader || "None"}</span><br>
              <span style="font-size: 0.8rem; color: #6b7280;">Total Failovers: ${topo.failovers || 0}</span>
           </div>
           <div style="margin-top: 10px; display: flex; gap: 10px;">
              <button class="danger action-btn" onclick="handleAction('delete_pod', 'pod', '${podName}')">Kill Pod</button>
              <button class="action-btn" onclick="wsApp.send(JSON.stringify({type: 'sync'}))">Manual Fetch</button>
           </div>
        </div>
      `;
    }

    const redisTopo = document.getElementById("topo-redis-layer");
    if (redisTopo) {
      redisTopo.innerHTML = `
           <div class="arch-node ${topo.primary !== "Unknown" ? "primary" : "down"}">
              <div class="arch-title">Redis Master</div>
              <div class="arch-meta">${topo.primary}</div>
           </div>
        `;
    }

    const replicaTopo = document.getElementById("topo-replica-layer");
    if (replicaTopo) {
      replicaTopo.innerHTML = `
           <div class="arch-node ${topo.replica !== "Unknown" ? "replica" : "down"}">
              <div class="arch-title">Replica</div>
              <div class="arch-meta">${topo.replica}</div>
           </div>
        `;
    }

    grid.innerHTML = html;
  } catch (err) {
    console.error("Failed to update Redis stats", err);
  }
}

function triggerTopologyPulse() {
  const ingress = document.querySelector(
    ".topology-container .node-layer:nth-child(1) .arch-node",
  );
  const appPods = document.querySelectorAll("#topo-app-layer .arch-node");
  const redisPrim = document.querySelector(
    "#topo-redis-layer .arch-node.primary",
  );

  if (ingress) {
    ingress.classList.add("pulse");
    setTimeout(() => ingress.classList.remove("pulse"), 1000);
  }

  setTimeout(() => {
    appPods.forEach((p) => p.classList.add("pulse"));
    setTimeout(() => appPods.forEach((p) => p.classList.remove("pulse")), 1000);
  }, 300);

  setTimeout(() => {
    if (redisPrim) {
      redisPrim.classList.add("pulse");
      setTimeout(() => redisPrim.classList.remove("pulse"), 1000);
    }
  }, 600);

  setTimeout(() => {
    appPods.forEach((p) => p.classList.add("pulse"));
    setTimeout(() => appPods.forEach((p) => p.classList.remove("pulse")), 1000);
  }, 900);
}

// ── Resource Explorer ──
async function fetchResources() {
  const type = document.getElementById("resourceType").value;
  const container = document.getElementById("resource-table-container");
  container.innerHTML = "Loading...";
  try {
    const data = await fetchK8sResource(type);
    if (!data || data.length === 0) {
      container.innerHTML = "No resources found.";
      return;
    }

    let html =
      '<table class="data-table"><thead><tr><th>Name</th><th>Namespace</th><th>Status</th><th>Creation Time</th><th>Actions</th></tr></thead><tbody>';
    data.forEach((item) => {
      let status = "Unknown";
      if (type === "pods") {
        const isTerminating = !!item.metadata.deletionTimestamp;
        const isReady =
          item.status.conditions &&
          item.status.conditions.some(
            (c) => c.type === "Ready" && c.status === "True",
          ) &&
          !isTerminating;
        status = isTerminating
          ? "Terminating"
          : isReady
            ? "Ready"
            : item.status.phase;
      } else if (type === "deployments" || type === "statefulsets") {
        status = `${item.status.readyReplicas || 0}/${item.status.replicas || 0} Ready`;
      } else if (type === "services") {
        status = item.spec.clusterIP || "None";
      } else if (type === "nodes") {
        const isReady = item.status.conditions && item.status.conditions.some(c => c.type === "Ready" && c.status === "True");
        status = isReady ? "Ready" : "NotReady";
      } else if (type === "events") {
        status = item.type || "Normal";
      } else if (type === "configmaps") {
        status = `${Object.keys(item.data || {}).length} keys`;
      }

      const isHighlightedNode = type === 'nodes' && (item.metadata.name.includes('desktop-') || item.metadata.name.includes('kind-'));
      const rowStyle = isHighlightedNode ? 'background-color: rgba(96, 165, 250, 0.15); border-left: 4px solid #3b82f6;' : '';

      html += `<tr style="${rowStyle}">
            <td>${item.metadata.name}</td>
            <td>${item.metadata.namespace || "Cluster"}</td>
            <td>${status}</td>
            <td>${new Date(item.metadata.creationTimestamp).toLocaleString()}</td>
            <td>
                  <button class="action-btn" onclick="fetchRaw('${type}', '${item.metadata.name}', 'yaml')">YAML</button>
                  <button class="action-btn" onclick="fetchRaw('${type}', '${item.metadata.name}', 'describe')">Describe</button>
                  ${type === "pods" ? `<button class="action-btn" onclick="fetchRaw('${type}', '${item.metadata.name}', 'logs')">Logs</button>` : ""}
                  ${type === "pods" ? `<button class="action-btn" style="background:#f59e0b; color:#fff; font-weight:bold;" onclick="confirmAction('Restart Pod', '${item.metadata.name}', '${type}', 'delete_pod')">Restart</button>` : ""}
                  ${type === "pods" ? `<button class="action-btn danger" style="color:white; font-weight:bold;" onclick="confirmAction('Delete Pod', '${item.metadata.name}', '${type}', 'delete_pod')">Delete</button>` : ""}
                  ${type === "deployments" || type === "statefulsets" ? `<button class="action-btn danger" style="color:white; font-weight:bold;" onclick="confirmAction('Restart', '${item.metadata.name}', '${type}', 'restart')">Restart</button>` : ""}
              </td>
           </tr>`;
    });
    html += "</tbody></table>";
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<span style="color:red">Error: ${err.message}</span>`;
  }
}

window.fetchRaw = async function (type, name, action) {
  try {
    const res = await fetch(`${window.APP_BASE}/k8s/raw/${type}/${name}/${action}`);
    const text = await res.text();
    document.getElementById("modal-title").innerText =
      action.toUpperCase() + ": " + name;
    
    const modalBody = document.getElementById("modal-body");
    modalBody.innerHTML = "";
    
    if (action === 'logs') {
      modalBody.style.whiteSpace = 'normal';
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const container = document.createElement('div');
      container.style.maxHeight = '60vh';
      container.style.overflowY = 'auto';
      container.style.paddingRight = '10px';
      
      lines.forEach(line => {
        let log;
        try {
           log = JSON.parse(line);
        } catch(e) {
           log = { rawText: line, pod: name };
        }
        container.appendChild(createLogElement(log));
      });
      modalBody.appendChild(container);
      setTimeout(() => container.scrollTop = container.scrollHeight, 100);
    } else {
      modalBody.style.whiteSpace = 'pre';
      let highlightedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (action === 'yaml') {
          highlightedText = highlightedText.replace(/^(\s*)([\w\.-]+):/gm, '$1<span style="color: #60a5fa; font-weight: bold;">$2</span>:');
      } else if (action === 'describe') {
          highlightedText = highlightedText.replace(/^(\s*)([a-zA-Z0-9\s\.-]{2,40}):/gm, '$1<span style="color: #a855f7; font-weight: bold;">$2</span>:');
      }
      
      const keywordRegex = /(desktop-worker\d*|desktop-control-plane|kind-cloud-prov\w*|kind-registry\w*|kindccm-[a-zA-Z0-9-]+)/gi;
      highlightedText = highlightedText.replace(keywordRegex, '<span style="background-color: #fbbf24; color: #000; font-weight: bold; padding: 0 4px; border-radius: 3px;">$1</span>');

      modalBody.innerHTML = `<pre style="background: #111; color: #eee; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; font-size: 0.9em; overflow-x: auto; max-height: 60vh;">${highlightedText}</pre>`;
    }
    
    document.getElementById("generic-modal").style.display = "flex";
  } catch (e) {
    showToast("Error", "Failed to fetch: " + e.message, true);
  }
};

// ── Operations Confirmation ──
function confirmAction(title, name, type, action, val = "") {
  document.getElementById("confirm-text").innerText =
    "Are you sure you want to " + title.toLowerCase() + " " + name + "?";
  document.getElementById("confirm-modal").style.display = "flex";
  document.getElementById("confirm-btn").onclick = async () => {
    document.getElementById("confirm-modal").style.display = "none";
    await handleAction(action, type, name, val);
  };
}

// ── Live Connections ──
async function fetchLiveConnections() {
  try {
    if (typeof fetchBlockedUsers === "function") fetchBlockedUsers();
    const res = await fetch(`${window.APP_BASE}/connections/live`);
    const data = await res.json();
    const tbody = document.getElementById("connections-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (Object.keys(data).length === 0) {
      tbody.innerHTML = `
                <tr>
                  <td colspan="5" style="text-align:center; padding: 40px; color: #9ca3af; background: rgba(0,0,0,0.2);">
                    <div style="font-size: 1.2rem; font-weight: bold;">0 Active Users Connected</div>
                    <div style="font-size: 0.9rem;">No active websocket sessions found in Redis state.</div>
                  </td>
                </tr>
            `;
      return;
    }

    for (const [pod, users] of Object.entries(data)) {
      users.forEach((u) => {
        tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                       <td style="padding: 12px; text-align: center;"><input type="checkbox" class="conn-checkbox" value="${u.connId}"></td>
                       <td style="padding: 12px; font-weight: bold; color: var(--color-blue);">${u.user}</td>
                       <td style="padding: 12px; font-family: monospace; font-size: 0.85em;">${u.connId}</td>
                       <td style="padding: 12px;">${pod}</td>
                       <td style="padding: 12px;">
                          <button class="action-btn danger" style="padding: 4px 8px; font-size: 0.8rem;" onclick="killConnections(['${u.connId}'])">Kill</button>
                       </td>
                    </tr>
                `;
      });
    }
  } catch (e) {
    console.error("Error fetching live connections:", e);
  }
}

function toggleAllConns(source) {
  const checkboxes = document.querySelectorAll(".conn-checkbox");
  checkboxes.forEach((cb) => (cb.checked = source.checked));
}

function killSelectedConnections() {
  const selected = Array.from(
    document.querySelectorAll(".conn-checkbox:checked"),
  ).map((cb) => cb.value);
  if (selected.length === 0)
    return showToast("Info", "No connections selected");
  killConnections(selected);
}

async function killConnections(ids) {
  try {
    const res = await fetch(`${window.APP_BASE}/connections/kill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionIds: ids }),
    });
    if (res.ok) {
      showToast("Success", `Kill signal sent to ${ids.length} connections`);
      setTimeout(fetchLiveConnections, 1000);
    } else {
      showToast("Error", "Failed to kill connections", true);
    }
  } catch (e) {
    showToast("Error", "Failed to kill connections", true);
  }
}

window.killRandomConnections = async function () {
  const input = document.getElementById("random-kill-count");
  const n = parseInt(input.value);

  if (!n || n <= 0) return showToast("Error", "Enter a valid number", true);

  try {
    const res = await fetch(`${window.APP_BASE}/connections/live`);
    const data = await res.json();

    const conns = [];
    Object.values(data).forEach((arr) => conns.push(...arr));

    if (conns.length === 0) return showToast("Info", "No connections to kill");

    const shuffled = conns.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, n).map((c) => c.connId);

    killConnections(selected);
    input.value = "";
  } catch (err) {
    showToast("Error", err.message, true);
  }
};

async function fetchBlockedUsers() {
  try {
    const res = await fetch(`${window.APP_BASE}/users/blocked`);
    const blocked = await res.json();
    const tbody = document.getElementById("blocked-tbody");
    if (!tbody) return;

    if (blocked.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; padding: 20px; color: #9ca3af;">No blocked users.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    blocked.forEach((user) => {
      tbody.innerHTML += `
               <tr style="border-bottom: 1px solid var(--border-color);">
                 <td style="padding: 12px; font-weight: bold; color: #f87171;">${user}</td>
                 <td style="padding: 12px;">
                    <button class="action-btn primary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="unblockUser('${user}')">Unblock</button>
                 </td>
               </tr>
            `;
    });
  } catch (err) {
    console.error(err);
  }
}

window.blockUser = async function () {
  const input = document.getElementById("block-username");
  const username = input.value.trim();
  if (!username) return showToast("Error", "Enter a username", true);

  try {
    const res = await fetch(`${window.APP_BASE}/users/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (res.ok) {
      showToast("Success", `Blocked user ${username}`);
      input.value = "";
      fetchBlockedUsers();
    } else {
      showToast("Error", "Failed to block user", true);
    }
  } catch (err) {
    showToast("Error", err.message, true);
  }
};

window.unblockUserDirect = function () {
  const input = document.getElementById("unblock-username");
  const username = input.value.trim();
  if (!username) return showToast("Error", "Enter a username", true);
  unblockUser(username);
  input.value = "";
};

window.unblockUser = async function (username) {
  try {
    const res = await fetch(`${window.APP_BASE}/users/unblock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (res.ok) {
      showToast("Success", `Unblocked user ${username}`);
      fetchBlockedUsers();
    } else {
      showToast("Error", "Failed to unblock user", true);
    }
  } catch (err) {
    showToast("Error", err.message, true);
  }
};

// 🕵️ Request Inspector (Tempo/OTEL) 🕵️──
async function simulateRequest() {
  try {
    const res = await fetch(`${window.APP_BASE}/simulate-request`);
    const data = await res.json();
    const viewer = document.getElementById("trace-viewer");
    viewer.innerHTML = `<div class="trace-block" style="border-left: 4px solid var(--accent)">
           Waiting for Trace ID: ${data.trace_id} from Tempo... (This may take up to 10 seconds)
        </div>`;

    // Poll Tempo logic
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 15) {
        clearInterval(interval);
        viewer.innerHTML = `<div class="trace-block" style="border-left: 4px solid var(--danger)">
                   Trace not found in Tempo within timeout.
                </div>`;
        return;
      }
      const traceRes = await fetch(`${window.APP_BASE}/trace/${data.trace_id}`);
      if (traceRes.ok) {
        clearInterval(interval);
        const traceData = await traceRes.json();
        renderTrace(traceData, data.trace_id, data.request_id);
      }
    }, 1000);
  } catch (e) {
    showToast("Error", "Failed to simulate request.", true);
  }
}

function renderTrace(data, traceId, reqId) {
  const viewer = document.getElementById("trace-viewer");
  let html = `<div class="trace-block">
        <strong>Request ID: ${reqId} (Trace: ${traceId})</strong><br><br>`;

  if (data && data.batches) {
    data.batches.forEach((batch) => {
      batch.scopeSpans.forEach((scope) => {
        scope.spans.forEach((span) => {
          const duration = (
            (span.endTimeUnixNano - span.startTimeUnixNano) /
            1000000
          ).toFixed(2);
          html += `<div class="trace-hop">
                        <span>↘ ${span.name}</span>
                        <span style="color: var(--accent)">${duration} ms</span>
                    </div>`;
        });
      });
    });
  } else {
    html += "Raw JSON: " + JSON.stringify(data);
  }
  html += "</div>";
  viewer.innerHTML = html;
}

// Init
refreshData();
setInterval(() => { if (pollingEnabled) refreshData(); }, 3000);

fetchLiveConnections();
setInterval(() => { if (pollingEnabled) fetchLiveConnections(); }, 5000);

fetchResources();
document
  .getElementById("resourceType")
  ?.addEventListener("change", fetchResources);

function createLogElement(log) {
  const div = document.createElement("div");
  div.className = "log-line";
  div.style.marginBottom = "8px";
  div.style.padding = "10px";
  div.style.backgroundColor = "var(--card-bg, #1f2937)";
  div.style.borderRadius = "6px";
  div.style.borderLeft = "4px solid #3b82f6";
  div.style.boxShadow = "0 1px 2px rgba(0,0,0,0.2)";
  div.style.fontFamily = "monospace";
  div.style.fontSize = "0.9em";

  let timeStr = "";
  if (log.timestamp || log.rawText) {
    const d = log.timestamp ? new Date(log.timestamp) : new Date();
    const t = d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    timeStr = `<span style="color: #9ca3af; font-size: 0.85em; margin-right: 8px;">[${t}]</span>`;
  }

  const p = log.pod || (log.rawText ? "System" : "");
  const podStr = p
    ? `<span style="color: #60a5fa; font-weight: bold; margin-right: 8px;">[${p}]</span>`
    : "";

  let levelColor = "#10b981";
  if (log.level === "error") levelColor = "#ef4444";
  else if (log.level === "warn") levelColor = "#f59e0b";

  let from = log.pod || "System";
  let to = "Cluster";
  let desc = log.event || "Event";
  const ev = log.event || "";

  if (ev === "admin_operation") {
    from = "Admin - " + (log.admin || "Unknown");
    to = log.target || "Cluster";
    desc = "Executed: " + log.operation;
  } else if (ev === "admin_block_user") {
    from = "Admin";
    to = "User - " + log.username;
    desc = "Blocked user";
  } else if (ev === "admin_unblock_user") {
    from = "Admin";
    to = "User - " + log.username;
    desc = "Unblocked user";
  } else if (ev === "admin_kill_connections") {
    from = "Admin";
    to = "Connections";
    desc = `Killed ${log.count} connections`;
  } else if (ev === "admin_redis_reset") {
    from = "Admin";
    to = "Redis - " + log.target;
    desc = "Reset Redis: " + (log.results || []).join(", ");
  } else if (ev === "user_increment") {
    from = "User - " + (log.user || "Unknown");
    to = "Redis Primary";
    desc = "Incremented Counter → " + log.value;
  } else if (ev === "user_join") {
    from = "User - " + (log.user || "Unknown");
    to = "Websocket Node";
    desc = "Connected to platform";
  } else if (ev === "stale_connections_cleaned") {
    from = "Redis System";
    to = "Websocket Node";
    desc =
      "Cleaned " +
      log.count +
      " stale connections" +
      (log.details && log.details.length > 0
        ? ": " +
          log.details.map((d) => d.user + " (" + d.connId + ")").join(", ")
        : "");
  } else if (ev === "redis_topology_update") {
    from = "Sentinel";
    to = "Redis";
    desc = `Primary: ${log.primary}, Replica: ${log.replica} (${log.replication_status})`;
  } else if (ev === "redis_failover") {
    from = log.old_primary;
    to = log.new_primary;
    desc = `Failover detected! Took ${log.failover_time_ms}ms`;
  } else if (ev === "topology_polling_failed") {
    from = "Websocket Node";
    to = "Redis Sentinel";
    desc = "Failed to poll topology: " + log.message;
  } else if (ev === "server_started") {
    from = "System";
    to = "Server";
    desc = "Server started";
  } else if (log.rawText) {
    from = "System";
    to = "System";
    desc = log.rawText;
  } else {
    const rest = { ...log };
    ["timestamp", "level", "event", "pod"].forEach((k) => delete rest[k]);
    if (Object.keys(rest).length > 0) desc += " " + JSON.stringify(rest);
  }

  if (log.level === "error") {
    div.style.borderLeft = "4px solid #ef4444";
    div.style.backgroundColor = "rgba(239,68,68,0.1)";
  } else if (log.level === "warn") {
    div.style.borderLeft = "4px solid #f59e0b";
    div.style.backgroundColor = "rgba(245,158,11,0.08)";
  }

  div.innerHTML = `${timeStr}${podStr}<div style="display:flex;flex-wrap:wrap;gap:15px;margin-top:8px;background:rgba(0,0,0,0.2);padding:8px 12px;border-radius:4px;border-left:2px solid ${levelColor};"><div style="flex:1;min-width:150px;"><strong style="color:#fbbf24;">From:</strong> <span style="color:#e5e7eb;">${from}</span></div><div style="flex:1;min-width:150px;"><strong style="color:#fbbf24;">To:</strong> <span style="color:#e5e7eb;">${to}</span></div><div style="flex:2;min-width:200px;"><strong style="color:#fbbf24;">Description:</strong> <span style="color:#e5e7eb;">${desc}</span></div></div>`;
  return div;
}

async function refreshLogs() {
  const logViewer = document.getElementById("logViewer");
  if (!logViewer) return;

  try {
    const res = await fetch(`${window.APP_BASE}/admin/logs`);
    if (!res.ok) return;
    const allLogs = await res.json();
    if (allLogs.length === 0) return;

    const showUser = document.getElementById("filter-user")?.classList.contains("active") ?? true;
    const showAdmin = document.getElementById("filter-admin")?.classList.contains("active") ?? true;
    const showRedis = document.getElementById("filter-redis")?.classList.contains("active") ?? true;
    const showApp = document.getElementById("filter-app")?.classList.contains("active") ?? true;

    const filteredLogs = allLogs.filter((log) => {
      if (!log.event) return showApp;
      const ev = log.event || "";
      if (ev === "user_join" || ev === "user_increment") return showUser;
      if (ev === "admin_operation" || ev === "admin_block_user" ||
          ev === "admin_unblock_user" || ev === "admin_kill_connections") return showAdmin;
      if (ev === "stale_connections_cleaned" || ev === "topology_polling_failed" ||
          ev === "redis_topology_update" || ev === "redis_failover" ||
          ev === "redis_error" || ev === "admin_redis_reset") return showRedis;
      return showApp;
    });

    // Only render latest 100 logs; key by timestamp+event to avoid duplicates
    const toRender = filteredLogs.slice(-100);
    const existingKeys = new Set();
    logViewer.querySelectorAll('[data-log-key]').forEach(el => existingKeys.add(el.dataset.logKey));

    // Check scroll position BEFORE adding new elements
    const threshold = 60;
    const atBottom = logViewer.scrollHeight - logViewer.scrollTop - logViewer.clientHeight < threshold;

    let added = 0;
    toRender.forEach((log) => {
      const key = (log.timestamp || '') + '|' + (log.event || '') + '|' + (log.pod || '') + '|' + (log.operation || log.results || '');
      if (existingKeys.has(key)) return;
      const el = createLogElement(log);
      el.dataset.logKey = key;
      logViewer.appendChild(el);
      added++;
    });

    // Cap total entries to 200 to avoid DOM bloat
    const allEntries = logViewer.querySelectorAll('[data-log-key]');
    if (allEntries.length > 200) {
      for (let i = 0; i < allEntries.length - 200; i++) allEntries[i].remove();
    }

    // Only auto-scroll if user was already at the bottom before new logs came in
    if (added > 0 && atBottom) logViewer.scrollTop = logViewer.scrollHeight;

  } catch (e) {
    console.error("Failed to fetch logs", e);
  }
}


  window.resetRedisPod = async function (target) {
    const labels = {
      primary: "Primary",
      replica: "Replica",
      both: "Both Primary & Replica",
    };
    if (
      !confirm(
        `Are you sure you want to reset Redis ${labels[target] || target}? This will delete the pod(s) and let Kubernetes restart them.`,
      )
    )
      return;
    try {
      const res = await fetch(
        `${window.APP_BASE}/admin/redis/reset/${target}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (data.success) {
        showToast("Redis Reset", data.results.join(", "));
      } else {
        showToast("Error", data.error || "Reset failed", true);
      }
    } catch (e) {
      showToast("Error", e.message, true);
    }
  };

  setInterval(() => { if (pollingEnabled) refreshLogs(); }, 5000);
  refreshLogs();

  // ── Redis Status Banner ────────────────────────────────────────────────────
  function updateRedisStatusBanner(topo) {
    const podStats = topo.podStats || {};
    const p0 = podStats['redis-primary-0'] || {};
    const r0 = podStats['redis-replica-0'] || {};

    // Figure out which pod is currently master
    const masterPod = p0.role === 'Primary' ? 'redis-primary-0' : (r0.role === 'Primary' ? 'redis-replica-0' : topo.primary || '—');
    const replicaPod = p0.role === 'Replica' ? 'redis-primary-0' : (r0.role === 'Replica' ? 'redis-replica-0' : topo.replica || '—');
    const syncStatus = p0.role === 'Primary' ? p0.syncStatus : (r0.role === 'Primary' ? r0.syncStatus : topo.status || '—');

    const el = (id) => document.getElementById(id);
    if (el('rs-master')) el('rs-master').textContent = masterPod;
    if (el('rs-replica')) el('rs-replica').textContent = replicaPod;
    if (el('rs-sync')) el('rs-sync').textContent = syncStatus;
    if (el('rs-latency')) el('rs-latency').textContent = (topo.latency ?? '—') + ' ms';
    if (el('rs-last-fetch')) el('rs-last-fetch').textContent = 'Last fetched: ' + new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
  }

  window.manualFetchRedisStatus = async function() {
    try {
      const topo = await fetchRedisTopology();
      if (topo) {
        renderRedisStats(topo);
        updateRedisStatusBanner(topo);
        showToast('Redis Status', 'Fetched at ' + new Date().toLocaleTimeString());
      }
    } catch(e) { showToast('Error', e.message, true); }
  };

  // ── Sidebar Resizer ────────────────────────────────────────────────────────
  (function() {
    const resizer = document.getElementById('sidebar-resizer');
    const sidebar = document.querySelector('.sidebar');
    if (!resizer || !sidebar) return;
    let isResizing = false;
    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(160, Math.min(520, e.clientX));
      sidebar.style.width = newWidth + 'px';
    });
    document.addEventListener('mouseup', () => {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  })();