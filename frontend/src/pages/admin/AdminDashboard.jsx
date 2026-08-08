import React, { useContext, useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../utils/constants';
import { getHealth } from '../../api/settingsApi';
import { getRounds } from '../../api/roundApi';
import { getLeaderboard } from '../../api/leaderboardApi';
import { EventStateContext } from '../../contexts/EventStateContext';
import {
  Activity, Server, Wifi, Database, Users, Trophy,
  CheckCircle, XCircle, Clock, Cpu, HardDrive, BarChart2
} from 'lucide-react';

function StatCard({ title, value, sub, icon: Icon, color = 'primary', status }) {
  const colorMap = {
    primary: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };
  return (
    <div className="card flex items-center space-x-4">
      <div className={`p-3 rounded-xl border ${colorMap[color] || colorMap.primary}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-bold text-white truncate">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
      {status !== undefined && (
        <div>
          {status
            ? <CheckCircle size={20} className="text-primary-400" />
            : <XCircle size={20} className="text-rose-400" />}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const socket = useSocket();
  const { currentRound, eventStatus } = useContext(EventStateContext);
  const [health, setHealth] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState([]);

  const [participantsCount, setParticipantsCount] = useState(0);
  const [adminsCount, setAdminsCount] = useState(0);

  const fetchData = async () => {
    try {
      const [hRes, rRes, lRes] = await Promise.allSettled([
        getHealth(),
        getRounds(),
        getLeaderboard(),
      ]);
      if (hRes.status === 'fulfilled') {
        setHealth(hRes.value.data);
        const p = hRes.value.data?.socketIo?.participantsCount;
        const a = hRes.value.data?.socketIo?.adminsCount;
        const total = hRes.value.data?.socketIo?.connectedClients;
        if (typeof p === 'number') setParticipantsCount(p);
        if (typeof a === 'number') setAdminsCount(a);
        if (typeof total === 'number') setOnlineCount(total);
      }
      if (rRes.status === 'fulfilled') setRounds(rRes.value.data.rounds || []);
      if (lRes.status === 'fulfilled') setLeaderboard(lRes.value.data.leaderboard || []);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchData(); }, []);

  // Live socket events
  useEffect(() => {
    if (!socket) return;
    const handlePresence = (d) => {
      if (typeof d.onlineCount === 'number') setOnlineCount(d.onlineCount);
      if (typeof d.participantsCount === 'number') setParticipantsCount(d.participantsCount);
      if (typeof d.adminsCount === 'number') setAdminsCount(d.adminsCount);
    };
    const handleLeaderboard = (d) => { if (d.leaderboard) setLeaderboard(d.leaderboard); };
    const handleLog = (d) => setRecentLogs((prev) => [d.logEntry, ...prev].slice(0, 10));

    socket.on(SOCKET_EVENTS.PRESENCE_ONLINE, handlePresence);
    socket.on(SOCKET_EVENTS.PRESENCE_OFFLINE, handlePresence);
    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, handleLeaderboard);
    socket.on(SOCKET_EVENTS.LOG_NEW, handleLog);
    // Re-fetch health (which has connectedClients) on connection established
    socket.on('connect', fetchData);
    return () => {
      socket.off(SOCKET_EVENTS.PRESENCE_ONLINE, handlePresence);
      socket.off(SOCKET_EVENTS.PRESENCE_OFFLINE, handlePresence);
      socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATE, handleLeaderboard);
      socket.off(SOCKET_EVENTS.LOG_NEW, handleLog);
      socket.off('connect', fetchData);
    };
  }, [socket]);

  const formatUptime = (secs) => {
    if (!secs) return '—';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatMem = (bytes) => {
    if (!bytes) return '—';
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Command Center</h1>
        <p className="text-slate-400 mt-1">Live event overview — GDG RVCE Turing Test</p>
      </div>

      {/* System Health */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center space-x-2">
          <Activity size={14} />
          <span>System Health</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Backend Status"
            value={health ? 'Online' : 'Unknown'}
            icon={Server}
            color="primary"
            status={!!health}
          />
          <StatCard
            title="Redis Status"
            value={health?.redis === 'ok' ? 'Connected' : 'Error'}
            icon={Database}
            color={health?.redis === 'ok' ? 'primary' : 'rose'}
            status={health?.redis === 'ok'}
          />
          <StatCard
            title="Socket.IO"
            value={socket ? 'Active' : 'Offline'}
            icon={Wifi}
            color="blue"
            status={!!socket}
          />
          <StatCard
            title="Active Participants"
            value={participantsCount}
            sub="Live logged-in participants"
            icon={Users}
            color="purple"
          />
          <StatCard
            title="Admins Online"
            value={adminsCount}
            sub="Live admin connections"
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Uptime"
            value={formatUptime(health?.uptime)}
            icon={Clock}
            color="primary"
          />
          <StatCard
            title="Memory Usage"
            value={formatMem(health?.memoryUsage?.heapUsed)}
            sub={`of ${formatMem(health?.memoryUsage?.heapTotal)} heap`}
            icon={Cpu}
            color="yellow"
          />
        </div>
      </section>

      {/* Event Status */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center space-x-2">
          <BarChart2 size={14} />
          <span>Event Status</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Event State</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${
              eventStatus === 'running' ? 'bg-primary-500/10 text-primary-400 border-primary-500/30' :
              eventStatus === 'paused' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
              eventStatus === 'ended' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {eventStatus.toUpperCase()}
            </span>
          </div>
          <div className="card">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Current Round</p>
            <p className="text-white font-semibold">{currentRound?.name || 'No active round'}</p>
            {currentRound?.status && (
              <p className="text-xs text-slate-500 mt-1 capitalize">{currentRound.status}</p>
            )}
          </div>
        </div>
      </section>

      {/* Rounds Overview */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Rounds Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {rounds.length === 0 && (
            <div className="col-span-4 card text-center py-8 text-slate-500">No rounds created yet.</div>
          )}
          {rounds.map((r) => (
            <div key={r.id} className={`card py-3 text-center border ${
              r.status === 'active' ? 'border-primary-500/40' :
              r.status === 'ended' ? 'border-slate-600/40' : 'border-dark-700'
            }`}>
              <p className="text-xs text-slate-500 truncate">{r.name}</p>
              <span className={`mt-1 inline-block text-xs font-bold px-2 py-0.5 rounded ${
                r.status === 'active' ? 'bg-primary-500/20 text-primary-400' :
                r.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                r.status === 'ended' ? 'bg-slate-700 text-slate-400' :
                'bg-dark-700 text-slate-500'
              }`}>{r.status}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Top 5 Leaderboard */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center space-x-2">
          <Trophy size={14} />
          <span>Top 5 Participants</span>
        </h2>
        <div className="card divide-y divide-dark-700">
          {leaderboard.slice(0, 5).length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">No scores yet.</p>
          )}
          {leaderboard.slice(0, 5).map((entry, i) => (
            <div key={entry.username} className="flex items-center justify-between py-3 px-1">
              <div className="flex items-center space-x-3">
                <span className={`w-6 h-6 flex items-center justify-center text-sm font-bold rounded-full ${
                  i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  i === 1 ? 'bg-slate-500/20 text-slate-300' :
                  i === 2 ? 'bg-amber-700/20 text-amber-500' : 'text-slate-500'
                }`}>{i + 1}</span>
                <div>
                  <p className="text-white font-medium text-sm">{entry.name || entry.username}</p>
                  <p className="text-xs text-slate-500">{entry.username}</p>
                </div>
              </div>
              <span className="font-bold text-white font-mono">{entry.score} pts</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Audit Logs */}
      {recentLogs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Live Audit Logs</h2>
          <div className="card divide-y divide-dark-700">
            {recentLogs.map((log, i) => (
              <div key={i} className="py-2.5 px-1 text-sm">
                <span className="text-primary-400 font-medium">{log.admin}</span>
                <span className="text-slate-400"> → {log.action}</span>
                <span className="text-slate-600 ml-2 text-xs">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
