import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../utils/constants';
import { getLogs } from '../../api/logApi';
import { FileText, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react';

const LEVEL_COLOR = {
  info: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
  warn: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  error: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

export default function LogsPage() {
  const socket = useSocket();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const bottomRef = useRef(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getLogs({ page, limit: pageSize, search });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, search]);

  // Live streaming new logs
  useEffect(() => {
    if (!socket) return;
    const handleLog = (data) => {
      if (liveMode && page === 1) {
        setLogs(prev => [data.logEntry, ...prev].slice(0, pageSize));
        setTotal(t => t + 1);
      }
    };
    socket.on(SOCKET_EVENTS.LOG_NEW, handleLog);
    return () => socket.off(SOCKET_EVENTS.LOG_NEW, handleLog);
  }, [socket, liveMode, page, pageSize]);

  const totalPages = Math.ceil(total / pageSize);

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
          <FileText size={24} className="text-primary-400" />
          <span>Audit Logs</span>
          <span className="text-sm font-normal text-slate-500">({total} entries)</span>
        </h1>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setLiveMode(m => !m)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              liveMode
                ? 'border-primary-500/40 bg-primary-500/10 text-primary-400'
                : 'border-dark-600 text-slate-400 hover:text-white'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${liveMode ? 'bg-primary-500 animate-pulse' : 'bg-slate-600'}`} />
            <span>{liveMode ? 'Live' : 'Static'}</span>
          </button>
          <button onClick={fetchLogs} className="p-2 rounded-lg border border-dark-600 text-slate-400 hover:text-white">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input-field pl-9 py-2 text-sm"
          placeholder="Search logs by action, admin..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Log Entries */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-900/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-40">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">User / Admin</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-36">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Pin-to-Pin Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-20">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50 font-mono text-xs">
              {loading && <tr><td colSpan={5} className="text-center py-10 text-slate-500">Loading logs...</td></tr>}
              {!loading && logs.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500">No logs found.</td></tr>}
              {!loading && logs.map((log, i) => (
                <tr key={i} className="hover:bg-dark-800/40 transition-colors">
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatTime(log.timestamp)}</td>
                  <td className="px-4 py-2.5 text-primary-400 font-bold">{log.admin || 'system'}</td>
                  <td className="px-4 py-2.5 font-bold text-white uppercase tracking-wide text-[11px]">{log.action}</td>
                  <td className="px-4 py-2.5 text-slate-300">
                    <div className="font-semibold text-slate-200">{log.target}</div>
                    {log.details && log.details !== log.target && (
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">{log.details}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded border text-xs font-sans ${LEVEL_COLOR[log.level] || LEVEL_COLOR.info}`}>
                      {log.level || 'info'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700 text-sm">
            <span className="text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex items-center space-x-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded border border-dark-600 text-slate-400 disabled:opacity-40 hover:text-white">
                <ChevronLeft size={16} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded border border-dark-600 text-slate-400 disabled:opacity-40 hover:text-white">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
