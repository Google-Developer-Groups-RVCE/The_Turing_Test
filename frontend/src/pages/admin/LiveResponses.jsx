import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../utils/constants';
import { getRounds } from '../../api/roundApi';
import { getResponses, exportResponses } from '../../api/responseApi';
import { Activity, Download, RefreshCw, CheckCircle, XCircle, Search, Filter } from 'lucide-react';

export default function LiveResponses() {
  const socket = useSocket();
  const [rounds, setRounds] = useState([]);
  const [selectedRound, setSelectedRound] = useState('');
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCorrect, setFilterCorrect] = useState('');
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    getRounds().then(res => {
      const r = res.data.rounds || [];
      setRounds(r);
      const active = r.find(x => x.status === 'active');
      if (active) setSelectedRound(active.id);
      else if (r.length) setSelectedRound(r[0].id);
    });
  }, []);

  const fetchResponses = useCallback(async () => {
    if (!selectedRound) return;
    setLoading(true);
    try {
      const res = await getResponses(selectedRound, { search, correct: filterCorrect });
      setResponses(res.data.responses || []);
      setLiveCount(res.data.total || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [selectedRound, search, filterCorrect]);

  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  // Live response streaming
  useEffect(() => {
    if (!socket) return;
    const handleNewResponse = (data) => {
      if (data.roundId === selectedRound) {
        setResponses(prev => {
          const exists = prev.find(r => r.username === data.username && r.roundId === data.roundId);
          if (exists) return prev;
          return [{ ...data, submittedAt: data.submittedAt || new Date().toISOString() }, ...prev];
        });
        setLiveCount(c => c + 1);
      }
    };
    socket.on(SOCKET_EVENTS.RESPONSE_RECEIVED, handleNewResponse);
    return () => socket.off(SOCKET_EVENTS.RESPONSE_RECEIVED, handleNewResponse);
  }, [socket, selectedRound]);

  const handleExport = async () => {
    if (!selectedRound) return;
    try {
      const res = await exportResponses(selectedRound);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `responses_${selectedRound}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  };

  const correctCount = responses.filter(r => r.isCorrect).length;
  const incorrectCount = responses.filter(r => !r.isCorrect).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
          <Activity size={24} className="text-primary-400" />
          <span>Live Responses</span>
          <span className="text-sm font-normal text-slate-500">({liveCount} total)</span>
        </h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-dark-600 text-slate-300 hover:text-white transition-colors text-sm">
            <Download size={16} /><span>Export CSV</span>
          </button>
          <button onClick={fetchResponses} className="p-2 rounded-lg border border-dark-600 text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-3">
          <div className="text-2xl font-bold text-white font-mono">{liveCount}</div>
          <div className="text-xs text-slate-500">Total Submissions</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-bold text-primary-400 font-mono">{correctCount}</div>
          <div className="text-xs text-slate-500">Correct</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-bold text-rose-400 font-mono">{incorrectCount}</div>
          <div className="text-xs text-slate-500">Incorrect</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="input-field py-2 text-sm w-48" value={selectedRound} onChange={e => setSelectedRound(e.target.value)}>
          {rounds.map(r => (
            <option key={r.id} value={r.id}>{r.name} ({r.status})</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-40">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input-field pl-9 py-2 text-sm" placeholder="Search by username..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field py-2 text-sm w-36" value={filterCorrect} onChange={e => setFilterCorrect(e.target.value)}>
          <option value="">All Answers</option>
          <option value="true">Correct Only</option>
          <option value="false">Incorrect Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-900/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Answer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Result</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Points</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50">
              {loading && <tr><td colSpan={5} className="text-center py-10 text-slate-500">Loading...</td></tr>}
              {!loading && responses.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500">No responses yet. Waiting for participants...</td></tr>}
              {!loading && responses.map((r, i) => (
                <tr key={`${r.username}-${i}`} className="hover:bg-dark-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-white text-xs">{r.username}</td>
                  <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{r.answer}</td>
                  <td className="px-4 py-3">
                    {r.isCorrect
                      ? <span className="flex items-center space-x-1 text-primary-400"><CheckCircle size={14} /><span>Correct</span></span>
                      : <span className="flex items-center space-x-1 text-rose-400"><XCircle size={14} /><span>Incorrect</span></span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-white">{r.pointsAwarded ?? 0}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleTimeString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
