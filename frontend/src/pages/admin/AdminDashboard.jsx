import React, { useContext, useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../utils/constants';
import { getHealth } from '../../api/settingsApi';
import { getRounds, startRound } from '../../api/roundApi';
import { getLeaderboard } from '../../api/leaderboardApi';
import { EventStateContext } from '../../contexts/EventStateContext';
import {
  Activity, Server, Wifi, Database, Users, Trophy,
  CheckCircle, XCircle, Clock, Cpu, HardDrive, BarChart2, Globe, Play, Square, ExternalLink, Sparkles
} from 'lucide-react';
import { getNgrokStatus, startNgrok, stopNgrok } from '../../api/ngrokApi';
import { getR5Status, openR5Voting, getR5VotingStatus, showR5Results, resetR5 } from '../../api/r5Api';

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

  const [ngrokStatus, setNgrokStatus] = useState(null);
  const [ngrokUrl, setNgrokUrl] = useState(null);
  const [isNgrokLoading, setIsNgrokLoading] = useState(false);
  const [ngrokError, setNgrokError] = useState(null);
  const [customDomain, setCustomDomain] = useState('');
  const [customPort, setCustomPort] = useState('80');

  const [isStartingRound, setIsStartingRound] = useState(false);
  const [roundStartError, setRoundStartError] = useState(null);

  const [r5Phase, setR5Phase] = useState('prompt');
  const [r5TotalSub, setR5TotalSub] = useState(0);
  const [r5TotalVote, setR5TotalVote] = useState(0);
  const [r5Expected, setR5Expected] = useState(0);
  const [isR5ActionLoading, setIsR5ActionLoading] = useState(false);

  const handleQuickStartRound = async (roundId) => {
    setIsStartingRound(true);
    setRoundStartError(null);
    try {
      await startRound(roundId);
      await fetchData(); // Refresh state
    } catch (err) {
      setRoundStartError(err.response?.data?.message || err.message);
    } finally {
      setIsStartingRound(false);
    }
  };

  const fetchData = async () => {
    try {
      const [hRes, rRes, lRes, nRes] = await Promise.allSettled([
        getHealth(),
        getRounds(),
        getLeaderboard(),
        getNgrokStatus(),
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
      if (nRes.status === 'fulfilled') {
        setNgrokStatus(nRes.value.data.status);
        setNgrokUrl(nRes.value.data.url);
      }
    } catch { /* silent */ }
  };

  const handleStartNgrok = async () => {
    setIsNgrokLoading(true);
    setNgrokError(null);
    try {
      const payload = { target: `http://localhost:${customPort || '80'}`, port: customPort };
      if (customDomain) payload.domain = customDomain;
      const res = await startNgrok(payload);
      setNgrokStatus(res.data.status);
      setNgrokUrl(res.data.url);
    } catch (err) {
      setNgrokError(err.response?.data?.error || err.message);
    } finally {
      setIsNgrokLoading(false);
    }
  };

  const handleStopNgrok = async () => {
    setIsNgrokLoading(true);
    setNgrokError(null);
    try {
      await stopNgrok();
      setNgrokStatus('offline');
      setNgrokUrl(null);
    } catch (err) {
      setNgrokError(err.response?.data?.error || err.message);
    } finally {
      setIsNgrokLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (currentRound?.id === 'round_5_reverse') {
      const fetchR5 = async () => {
        try {
          const sRes = await getR5Status();
          setR5Phase(sRes.data.phase || 'prompt');
          setR5TotalSub(sRes.data.totalSubmitted || 0);
          setR5Expected(sRes.data.totalExpected || 0);
          const vRes = await getR5VotingStatus();
          setR5TotalVote(vRes.data.totalVoted || 0);
        } catch {}
      };
      fetchR5();
    }
  }, [currentRound]);

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

    const handleR5Phase = (d) => { if(d?.phase) setR5Phase(d.phase); };
    const handleR5Resp = (d) => { if(d?.totalSubmitted !== undefined) setR5TotalSub(d.totalSubmitted); if(d?.totalExpected !== undefined) setR5Expected(d.totalExpected); };
    const handleR5Vote = (d) => { if(d?.totalVoted !== undefined) setR5TotalVote(d.totalVoted); };

    socket.on(SOCKET_EVENTS.PRESENCE_ONLINE, handlePresence);
    socket.on(SOCKET_EVENTS.PRESENCE_OFFLINE, handlePresence);
    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, handleLeaderboard);
    socket.on(SOCKET_EVENTS.LOG_NEW, handleLog);
    socket.on('r5:phase_changed', handleR5Phase);
    socket.on('r5:response_received', handleR5Resp);
    socket.on('r5:vote_received', handleR5Vote);
    // Re-fetch health (which has connectedClients) on connection established
    socket.on('connect', fetchData);
    return () => {
      socket.off(SOCKET_EVENTS.PRESENCE_ONLINE, handlePresence);
      socket.off(SOCKET_EVENTS.PRESENCE_OFFLINE, handlePresence);
      socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATE, handleLeaderboard);
      socket.off(SOCKET_EVENTS.LOG_NEW, handleLog);
      socket.off('r5:phase_changed', handleR5Phase);
      socket.off('r5:response_received', handleR5Resp);
      socket.off('r5:vote_received', handleR5Vote);
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
            sub={`of ${formatMem(health?.memoryUsage?.heap_size_limit) || '512 MB'} allocated`}
            icon={Cpu}
            color="yellow"
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center space-x-2">
          <Globe size={14} />
          <span>Public Hosting (Ngrok)</span>
        </h2>
        <div className="card space-y-4 border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">Ngrok Tunnel</p>
              <p className="text-sm text-slate-400">Expose your app to participants outside your network.</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${ngrokStatus === 'online' ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-700 text-slate-400'}`}>
                {ngrokStatus || 'OFFLINE'}
              </span>
            </div>
          </div>

          {ngrokError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-rose-400 text-sm">
              {ngrokError}
            </div>
          )}

          {ngrokStatus === 'online' && ngrokUrl && (
            <div className="p-3 bg-dark-900 rounded border border-primary-500/30 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Public URL — Share with participants</p>
                <a href={ngrokUrl} target="_blank" rel="noreferrer" className="text-primary-400 font-mono text-sm hover:underline flex items-center space-x-1 mt-0.5">
                  <span>{ngrokUrl}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {ngrokStatus !== 'online' && (
            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Custom Domain (Optional)</label>
                <input 
                  type="text" 
                  value={customDomain} 
                  onChange={(e) => setCustomDomain(e.target.value)} 
                  className="input-field text-sm py-1.5" 
                  placeholder="e.g. my-event.ngrok-free.dev" 
                />
              </div>
              <div className="w-24">
                <label className="block text-xs text-slate-500 mb-1">Local Port</label>
                <input 
                  type="text" 
                  value={customPort} 
                  onChange={(e) => setCustomPort(e.target.value)} 
                  className="input-field text-sm py-1.5" 
                  placeholder="80" 
                />
              </div>
            </div>
          )}

          <div className="flex space-x-2 pt-2">
            {ngrokStatus !== 'online' ? (
              <button
                onClick={handleStartNgrok}
                disabled={isNgrokLoading}
                className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white py-2 rounded font-semibold text-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <Play size={16} />
                <span>{isNgrokLoading ? 'Starting Tunnel...' : 'Host on Ngrok'}</span>
              </button>
            ) : (
              <button
                onClick={handleStopNgrok}
                disabled={isNgrokLoading}
                className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white py-2 rounded font-semibold text-sm flex items-center justify-center space-x-2 transition-colors"
              >
                <Square size={16} />
                <span>{isNgrokLoading ? 'Stopping...' : 'Stop Hosting'}</span>
              </button>
            )}
          </div>
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

        {/* Round 5 Controls */}
        {currentRound?.id === 'round_5_reverse' && (
          <div className="card mt-4 border-violet-500/30 bg-violet-900/10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-violet-400 flex items-center space-x-2">
                <Sparkles size={16} />
                <span>Round 5 Control Panel</span>
              </p>
              <span className="px-2 py-1 text-xs font-bold rounded bg-violet-500/20 text-violet-300 uppercase">
                Phase: {r5Phase}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded border border-white/10 bg-black/20">
                <p className="text-xs text-slate-500 uppercase mb-1">Submissions</p>
                <p className="text-xl font-bold text-white">{r5TotalSub} <span className="text-sm text-slate-400 font-normal">/ {r5Expected}</span></p>
              </div>
              <div className="p-3 rounded border border-white/10 bg-black/20">
                <p className="text-xs text-slate-500 uppercase mb-1">Votes Cast</p>
                <p className="text-xl font-bold text-white">{r5TotalVote} <span className="text-sm text-slate-400 font-normal">/ {r5Expected}</span></p>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={async () => {
                  setIsR5ActionLoading(true);
                  try { await openR5Voting(); setR5Phase('voting'); } catch(e) { alert(e.response?.data?.message || e.message); }
                  setIsR5ActionLoading(false);
                }}
                disabled={isR5ActionLoading || r5Phase !== 'prompt'}
                className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-2 rounded font-semibold text-sm transition-colors"
              >
                Open Voting
              </button>
              <button
                onClick={async () => {
                  setIsR5ActionLoading(true);
                  try { await showR5Results(); setR5Phase('results'); } catch(e) { alert(e.response?.data?.message || e.message); }
                  setIsR5ActionLoading(false);
                }}
                disabled={isR5ActionLoading || r5Phase !== 'voting'}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2 rounded font-semibold text-sm transition-colors"
              >
                Show Results
              </button>
              <button
                onClick={async () => {
                  if(window.confirm('Reset Round 5? This clears all responses and votes.')) {
                    setIsR5ActionLoading(true);
                    try { await resetR5(); setR5Phase('prompt'); setR5TotalSub(0); setR5TotalVote(0); } catch(e) { alert(e.response?.data?.message || e.message); }
                    setIsR5ActionLoading(false);
                  }
                }}
                disabled={isR5ActionLoading}
                className="px-4 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 disabled:opacity-50 border border-rose-500/30 rounded font-semibold text-sm transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Quick Start Round */}
        <div className="card mt-4 border-dark-700">
          <p className="text-sm font-semibold text-white mb-2">Quick Start Round</p>
          {roundStartError && (
            <div className="mb-3 p-2 bg-rose-500/10 border border-rose-500/30 rounded text-rose-400 text-xs">
              {roundStartError}
            </div>
          )}
          <div className="flex space-x-2">
            <select
              className="input-field flex-1"
              onChange={(e) => {
                if (e.target.value) {
                  handleQuickStartRound(e.target.value);
                  e.target.value = ""; // Reset dropdown
                }
              }}
              disabled={isStartingRound}
            >
              <option value="">-- Select a round to start immediately --</option>
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.status})</option>
              ))}
            </select>
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
