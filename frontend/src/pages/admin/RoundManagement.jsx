import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  getRounds, createRound, updateRound, deleteRound,
  startRound, pauseRound, resumeRound, restartRound, endRound,
  resetEvent, endEvent
} from '../../api/roundApi';
import { getSettings, updateSettings } from '../../api/settingsApi';
import { useSocket } from '../../hooks/useSocket';
import { EventStateContext } from '../../contexts/EventStateContext';
import { SOCKET_EVENTS } from '../../utils/constants';
import {
  Layers, Play, Pause, RotateCcw, Square, Plus, Edit, Trash2,
  RefreshCw, X, AlertTriangle, SkipForward, Eye, Trophy, Monitor, CheckCircle
} from 'lucide-react';

function RoundModal({ round, onClose, onSave }) {
  const [form, setForm] = useState({
    name: round?.name || '',
    durationSeconds: round?.durationSeconds || 300,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save round');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="card w-full max-w-sm relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
        <h2 className="text-lg font-bold text-white mb-5">{round ? 'Edit Round' : 'New Round'}</h2>
        {error && <div className="mb-4 bg-rose-900/40 border border-rose-500/40 text-rose-300 p-3 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Round Name</label>
            <input required className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Round 1 – Aptitude" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Duration (seconds)</label>
            <input type="number" min="30" max="3600" className="input-field" value={form.durationSeconds} onChange={e => setForm(f => ({ ...f, durationSeconds: parseInt(e.target.value) || 300 }))} />
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-dark-600 text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Saving...' : 'Save Round'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const STATUS_COLOR = {
  pending: 'bg-slate-700 text-slate-400 border-slate-600',
  active: 'bg-primary-500/20 text-primary-400 border-primary-500/40',
  paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  ended: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function RoundManagement() {
  const socket = useSocket();
  const { showLeaderboard, setShowLeaderboard } = useContext(EventStateContext);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [togglingLeaderboard, setTogglingLeaderboard] = useState(false);

  const showSuccess = (m) => { setSuccess(m); setTimeout(() => setSuccess(''), 3000); };
  const showError = (m) => { setError(m); setTimeout(() => setError(''), 5000); };

  const fetchRounds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRounds();
      setRounds(res.data.rounds || []);
    } catch { showError('Failed to load rounds'); }
    finally { setLoading(false); }
  }, []);

  const fetchSettingsState = useCallback(async () => {
    try {
      const res = await getSettings();
      if (res.data?.showLeaderboard !== undefined) {
        setShowLeaderboard(String(res.data.showLeaderboard) === 'true');
      }
    } catch { /* silent */ }
  }, [setShowLeaderboard]);

  useEffect(() => {
    fetchRounds();
    fetchSettingsState();
  }, [fetchRounds, fetchSettingsState]);

  // Live updates
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchRounds();
    socket.on(SOCKET_EVENTS.ROUND_CHANGED, refresh);
    socket.on(SOCKET_EVENTS.ROUND_PAUSED, refresh);
    socket.on(SOCKET_EVENTS.ROUND_RESUMED, refresh);
    socket.on(SOCKET_EVENTS.ROUND_ENDED, refresh);
    return () => {
      socket.off(SOCKET_EVENTS.ROUND_CHANGED, refresh);
      socket.off(SOCKET_EVENTS.ROUND_PAUSED, refresh);
      socket.off(SOCKET_EVENTS.ROUND_RESUMED, refresh);
      socket.off(SOCKET_EVENTS.ROUND_ENDED, refresh);
    };
  }, [socket, fetchRounds]);

  const doAction = async (label, fn) => {
    setActionLoading(label);
    try {
      await fn();
      showSuccess(`${label} successful.`);
      fetchRounds();
    } catch (err) {
      showError(err.response?.data?.message || `${label} failed`);
    } finally {
      setActionLoading('');
    }
  };

  const handleToggleLeaderboard = async () => {
    const nextVal = !showLeaderboard;
    setTogglingLeaderboard(true);
    try {
      await updateSettings({ showLeaderboard: String(nextVal) });
      setShowLeaderboard(nextVal);
      showSuccess(`Participant Leaderboard view ${nextVal ? 'ENABLED (Showing live scores to participants)' : 'DISABLED (Showing GDG Club Waiting Room)'}.`);
    } catch {
      showError('Failed to toggle leaderboard view');
    } finally {
      setTogglingLeaderboard(false);
    }
  };

  const handleNextRound = async () => {
    const activeRound = rounds.find(r => r.status === 'active');
    const pendingRound = rounds.find(r => r.status === 'pending');
    if (!pendingRound && !activeRound) {
      showError('No pending or active rounds to advance to.');
      return;
    }
    doAction('Advance to Next Round', async () => {
      if (activeRound) {
        await endRound(activeRound.id);
      }
      if (pendingRound) {
        await startRound(pendingRound.id);
      }
    });
  };

  const handleSaveRound = async (roundData) => {
    if (modal === 'create') {
      await createRound(roundData);
      showSuccess('Round created.');
    } else {
      await updateRound(modal.id, roundData);
      showSuccess('Round updated.');
    }
    fetchRounds();
  };

  const handleDelete = async (round) => {
    if (!window.confirm(`Delete "${round.name}"?`)) return;
    doAction('Delete round', () => deleteRound(round.id));
  };

  const handleEventReset = () => {
    if (!window.confirm('Reset the entire event? This will clear all progress!')) return;
    doAction('Event reset', () => resetEvent());
  };

  const handleEventEnd = () => {
    if (!window.confirm('End the event? This cannot be undone.')) return;
    doAction('End event', () => endEvent());
  };

  const activeRound = rounds.find(r => r.status === 'active');

  return (
    <div className="space-y-6">
      {modal && (
        <RoundModal
          round={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSaveRound}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
          <Layers size={24} className="text-primary-400" />
          <span>Round & Stage Control</span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setModal('create')} className="btn-primary flex items-center space-x-2 text-sm">
            <Plus size={16} /><span>New Round</span>
          </button>
          <button onClick={fetchRounds} className="p-2 rounded-lg border border-dark-600 text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className={`p-3 rounded-lg text-sm border ${error ? 'bg-rose-900/40 border-rose-500/40 text-rose-300' : 'bg-primary-900/40 border-primary-500/40 text-primary-300'}`}>
          {error || success}
        </div>
      )}

      {/* Admin Master Stage Control & Live Participant Simulation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stage Controls */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <Monitor size={16} className="text-primary-400" />
            <span>Live Stage & Broadcast Controls</span>
          </h2>

          <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-700 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white flex items-center space-x-2">
                <Trophy size={16} className="text-yellow-400" />
                <span>Show Participant Leaderboard</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {showLeaderboard ? 'ON — Participants currently see Live Scores' : 'OFF — Participants see GDG Club Room'}
              </p>
            </div>
            <button
              onClick={handleToggleLeaderboard}
              disabled={togglingLeaderboard}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showLeaderboard ? 'bg-primary-500' : 'bg-dark-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showLeaderboard ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleNextRound}
              disabled={!!actionLoading}
              className="flex-1 btn-primary py-2 text-sm flex items-center justify-center space-x-2"
            >
              <SkipForward size={16} />
              <span>Advance to Next Round</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-dark-700">
            <button onClick={handleEventReset} className="flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-xs font-semibold">
              <AlertTriangle size={14} /><span>Reset Event</span>
            </button>
            <button onClick={handleEventEnd} className="flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors text-xs font-semibold">
              <Square size={14} /><span>End Event</span>
            </button>
          </div>
        </div>

        {/* Live Simulation View */}
        <div className="card bg-dark-800/80 border-primary-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-400 flex items-center space-x-1">
                <Eye size={14} /><span>Participant Screen Simulation</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            </div>

            <div className="p-4 rounded-xl bg-dark-900 border border-dark-700 text-center space-y-2">
              {showLeaderboard ? (
                <div>
                  <Trophy size={32} className="text-yellow-400 mx-auto mb-1" />
                  <div className="text-sm font-bold text-white">Showing Live Leaderboard View</div>
                  <div className="text-xs text-slate-500">Participants see rank standings & scores live</div>
                </div>
              ) : activeRound ? (
                <div>
                  <Play size={32} className="text-primary-400 mx-auto mb-1 animate-pulse" />
                  <div className="text-sm font-bold text-white">Active Round: {activeRound.name}</div>
                  <div className="text-xs text-slate-400">Participants are answering question for this round</div>
                </div>
              ) : (
                <div>
                  <CheckCircle size={32} className="text-blue-400 mx-auto mb-1" />
                  <div className="text-sm font-bold text-white">GDG RVCE Club Waiting Room</div>
                  <div className="text-xs text-slate-400">Event is Idle — Participants see GDG branding & online count</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-dark-700 text-xs text-slate-500 flex justify-between items-center">
            <span>State: <strong className="text-slate-300 capitalize">{activeRound ? 'Round Active' : showLeaderboard ? 'Leaderboard Display' : 'Idle'}</strong></span>
            <span>Rounds Configured: <strong className="text-slate-300">{rounds.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Rounds List */}
      {loading && <div className="text-center py-8 text-slate-500">Loading rounds...</div>}

      <div className="space-y-4">
        {rounds.map((round, idx) => (
          <div key={round.id} className={`card border ${STATUS_COLOR[round.status] || 'border-dark-700'}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-slate-400 text-sm font-bold">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{round.name}</h3>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
                    <span className={`px-2 py-0.5 rounded border font-medium capitalize ${STATUS_COLOR[round.status]}`}>
                      {round.status}
                    </span>
                    {round.durationSeconds && <span>{Math.floor(round.durationSeconds / 60)} min</span>}
                    {round.startedAt && <span>Started {new Date(Number(round.startedAt) || round.startedAt).toLocaleTimeString()}</span>}
                  </div>
                </div>
              </div>

              {/* Round Actions */}
              <div className="flex flex-wrap gap-2">
                {round.status === 'pending' && (
                  <button onClick={() => doAction('Start round', () => startRound(round.id))} disabled={!!actionLoading} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-400 hover:bg-primary-500/20 transition-colors text-sm">
                    <Play size={14} /><span>Start</span>
                  </button>
                )}
                {round.status === 'active' && (
                  <>
                    <button onClick={() => doAction('Pause round', () => pauseRound(round.id))} disabled={!!actionLoading} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-sm">
                      <Pause size={14} /><span>Pause</span>
                    </button>
                    <button onClick={() => doAction('End round', () => endRound(round.id))} disabled={!!actionLoading} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors text-sm">
                      <Square size={14} /><span>End</span>
                    </button>
                  </>
                )}
                {round.status === 'paused' && (
                  <button onClick={() => doAction('Resume round', () => resumeRound(round.id))} disabled={!!actionLoading} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-400 hover:bg-primary-500/20 transition-colors text-sm">
                    <Play size={14} /><span>Resume</span>
                  </button>
                )}
                {(round.status === 'active' || round.status === 'paused' || round.status === 'ended') && (
                  <button onClick={() => doAction('Restart round', () => restartRound(round.id))} disabled={!!actionLoading} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm">
                    <RotateCcw size={14} /><span>Restart</span>
                  </button>
                )}
                <button onClick={() => setModal(round)} className="p-1.5 rounded hover:bg-dark-700 text-slate-400 hover:text-white transition-colors" title="Edit">
                  <Edit size={15} />
                </button>
                <button onClick={() => handleDelete(round)} disabled={round.status === 'active'} className="p-1.5 rounded hover:bg-rose-900/30 text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-40" title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {!loading && rounds.length === 0 && (
          <div className="card text-center py-12 text-slate-500">
            <Layers size={40} className="mx-auto mb-3 opacity-30" />
            <p>No rounds created yet. Click "New Round" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
