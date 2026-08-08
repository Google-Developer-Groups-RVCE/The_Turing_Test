import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { SOCKET_EVENTS } from '../../utils/constants';
import { getLeaderboard, getRoundLeaderboard, overrideScore, resetLeaderboard, recalculateLeaderboard } from '../../api/leaderboardApi';
import { getRounds } from '../../api/roundApi';
import { Trophy, Crown, Medal, RefreshCw, RotateCcw, Edit, X, Check, Download } from 'lucide-react';

function ScoreModal({ user, onClose, onSave }) {
  const [score, setScore] = useState(user.score ?? 0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(user.username, Number(score));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="card w-full max-w-sm relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
        <h2 className="text-lg font-bold text-white mb-1">Override Score</h2>
        <p className="text-sm text-slate-400 mb-5">{user.name || user.username}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">New Score</label>
            <input type="number" min="0" className="input-field text-xl font-mono" value={score} onChange={e => setScore(e.target.value)} autoFocus />
          </div>
          <div className="flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-dark-600 text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Saving...' : 'Override'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminLeaderboard() {
  const socket = useSocket();
  const [entries, setEntries] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [selectedRound, setSelectedRound] = useState('overall');
  const [loading, setLoading] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [success, setSuccess] = useState('');

  const showSuccess = (m) => { setSuccess(m); setTimeout(() => setSuccess(''), 3000); };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = selectedRound === 'overall'
        ? await getLeaderboard()
        : await getRoundLeaderboard(selectedRound);
      setEntries(res.data.leaderboard || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    getRounds().then(res => setRounds(res.data.rounds || []));
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [selectedRound]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (data) => { if (data.leaderboard) setEntries(data.leaderboard); };
    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, handleUpdate);
    return () => socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATE, handleUpdate);
  }, [socket]);

  const handleOverride = async (username, score) => {
    await overrideScore(username, score);
    showSuccess(`Score for ${username} overridden.`);
    fetchLeaderboard();
  };

  const handleReset = async () => {
    if (!window.confirm('Reset the entire leaderboard? All scores will be cleared!')) return;
    await resetLeaderboard();
    showSuccess('Leaderboard reset.');
    fetchLeaderboard();
  };

  const handleRecalculate = async () => {
    await recalculateLeaderboard();
    showSuccess('Leaderboard recalculated from responses.');
    fetchLeaderboard();
  };

  const handleExport = () => {
    const csv = ['Rank,Username,Name,Score', ...entries.map((e, i) => `${i+1},${e.username},${e.name||''},${e.score}`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'leaderboard.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const getMedal = (rank) => {
    if (rank === 1) return <Crown size={16} className="text-yellow-400" />;
    if (rank === 2) return <Medal size={16} className="text-slate-300" />;
    if (rank === 3) return <Medal size={16} className="text-amber-600" />;
    return <span className="text-slate-500 text-sm font-mono">{rank}</span>;
  };

  return (
    <div className="space-y-6">
      {editEntry && <ScoreModal user={editEntry} onClose={() => setEditEntry(null)} onSave={handleOverride} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
          <Trophy size={24} className="text-yellow-400" />
          <span>Leaderboard</span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleRecalculate} className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm">
            <RefreshCw size={15} /><span>Recalculate</span>
          </button>
          <button onClick={handleReset} className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors text-sm">
            <RotateCcw size={15} /><span>Reset</span>
          </button>
          <button onClick={handleExport} className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-dark-600 text-slate-300 hover:text-white transition-colors text-sm">
            <Download size={15} /><span>Export</span>
          </button>
          <button onClick={fetchLeaderboard} className="p-2 rounded-lg border border-dark-600 text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {success && <div className="p-3 rounded-lg text-sm border bg-primary-900/40 border-primary-500/40 text-primary-300">{success}</div>}

      {/* Round Selector */}
      <div className="flex gap-3">
        <select className="input-field py-2 text-sm w-56" value={selectedRound} onChange={e => setSelectedRound(e.target.value)}>
          <option value="overall">Overall Leaderboard</option>
          {rounds.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {/* Leaderboard Table */}
      <div className="card overflow-hidden p-0">
        {loading && <div className="text-center py-10 text-slate-500">Loading...</div>}
        <div className="divide-y divide-dark-700">
          {!loading && entries.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Trophy size={40} className="mx-auto mb-3 opacity-30" />
              <p>No scores yet.</p>
            </div>
          )}
          {!loading && entries.map((entry, index) => {
            const rank = index + 1;
            return (
              <div key={entry.username} className={`flex items-center space-x-4 px-5 py-4 hover:bg-dark-800/40 transition-colors group
                ${rank === 1 ? 'bg-yellow-900/10' : rank === 2 ? 'bg-slate-700/10' : rank === 3 ? 'bg-amber-900/10' : ''}
              `}>
                <div className="w-8 flex items-center justify-center">{getMedal(rank)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{entry.name || entry.username}</div>
                  <div className="text-xs text-slate-500 font-mono">{entry.username}</div>
                </div>
                <div className="text-xl font-bold font-mono text-white">{entry.score}</div>
                <button
                  onClick={() => setEditEntry(entry)}
                  className="p-1.5 rounded hover:bg-dark-700 text-slate-600 group-hover:text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                  title="Override score"
                >
                  <Edit size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
