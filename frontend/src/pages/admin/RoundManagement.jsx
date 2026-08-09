import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  getRounds, createRound, updateRound, deleteRound,
  startRound, pauseRound, resumeRound, restartRound, endRound,
  extendRoundTime, resetEvent, endEvent, seedSampleData, clearAllLiveData
} from '../../api/roundApi';
import { getQuestions, getActiveQuestion, nextQuestion, previousQuestion, setActiveQuestion } from '../../api/questionApi';
import { getResponses } from '../../api/responseApi';
import { getSettings, updateSettings } from '../../api/settingsApi';
import { useSocket } from '../../hooks/useSocket';
import { EventStateContext } from '../../contexts/EventStateContext';
import { SOCKET_EVENTS } from '../../utils/constants';
import {
  Layers, Play, Pause, RotateCcw, Square, Plus, Edit, Trash2,
  RefreshCw, X, AlertTriangle, SkipForward, SkipBack, Eye, Trophy, Monitor, CheckCircle,
  Clock, Sparkles, Database, Trash, ChevronRight, HelpCircle
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

  const [activeQuestion, setActiveQuestionState] = useState(null);
  const [roundQuestions, setRoundQuestions] = useState([]);
  const [responseCount, setResponseCount] = useState(0);

  const showSuccess = (m) => { setSuccess(m); setTimeout(() => setSuccess(''), 3000); };
  const showError = (m) => { setError(m); setTimeout(() => setError(''), 5000); };

  const fetchRounds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRounds();
      const list = res.data.rounds || [];
      setRounds(list);

      const active = list.find(r => r.status === 'active');
      if (active) {
        getQuestions(active.id).then(qListRes => {
          setRoundQuestions(qListRes.data?.questions || []);
        }).catch(() => setRoundQuestions([]));

        getActiveQuestion(active.id)
          .then(qRes => {
            const q = qRes.data?.question || (Array.isArray(qRes.data) ? qRes.data[0] : null);
            setActiveQuestionState(q || null);
          }).catch(() => setActiveQuestionState(null));

        getResponses(active.id)
          .then(respRes => {
            const count = respRes.data?.total || (Array.isArray(respRes.data) ? respRes.data.length : 0);
            setResponseCount(count);
          }).catch(() => setResponseCount(0));
      } else {
        setActiveQuestionState(null);
        setRoundQuestions([]);
        setResponseCount(0);
      }
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

  // Socket live updates
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchRounds();
    const handleNewResponse = () => setResponseCount(c => c + 1);
    const handleQuestionChanged = (data) => {
      if (data?.question) setActiveQuestionState(data.question);
    };

    socket.on(SOCKET_EVENTS.ROUND_CHANGED, refresh);
    socket.on(SOCKET_EVENTS.ROUND_PAUSED, refresh);
    socket.on(SOCKET_EVENTS.ROUND_RESUMED, refresh);
    socket.on(SOCKET_EVENTS.ROUND_ENDED, refresh);
    socket.on(SOCKET_EVENTS.RESPONSE_RECEIVED, handleNewResponse);
    socket.on('question:changed', handleQuestionChanged);

    return () => {
      socket.off(SOCKET_EVENTS.ROUND_CHANGED, refresh);
      socket.off(SOCKET_EVENTS.ROUND_PAUSED, refresh);
      socket.off(SOCKET_EVENTS.ROUND_RESUMED, refresh);
      socket.off(SOCKET_EVENTS.ROUND_ENDED, refresh);
      socket.off(SOCKET_EVENTS.RESPONSE_RECEIVED, handleNewResponse);
      socket.off('question:changed', handleQuestionChanged);
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
      showSuccess(`Participant Leaderboard view ${nextVal ? 'ENABLED' : 'DISABLED'}.`);
    } catch {
      showError('Failed to toggle leaderboard view');
    } finally {
      setTogglingLeaderboard(false);
    }
  };

  const handleExtendTime = async (extraSecs) => {
    const activeRound = rounds.find(r => r.status === 'active');
    if (!activeRound) {
      showError('No active round to extend time for.');
      return;
    }
    doAction(`Added +${extraSecs}s extra time`, () => extendRoundTime(activeRound.id, extraSecs));
  };

  const handleNextQuestion = async () => {
    const activeRound = rounds.find(r => r.status === 'active');
    if (!activeRound) {
      showError('No active round. Please start a round first.');
      return;
    }
    doAction('Next Question', async () => {
      const res = await nextQuestion(activeRound.id);
      if (res.data?.question) {
        setActiveQuestionState(res.data.question);
      }
    });
  };

  const handlePrevQuestion = async () => {
    const activeRound = rounds.find(r => r.status === 'active');
    if (!activeRound) {
      showError('No active round.');
      return;
    }
    doAction('Previous Question', async () => {
      const res = await previousQuestion(activeRound.id);
      if (res.data?.question) {
        setActiveQuestionState(res.data.question);
      }
    });
  };

  const handleSelectQuestion = async (qId) => {
    const activeRound = rounds.find(r => r.status === 'active');
    if (!activeRound) return;
    doAction('Set Active Question', async () => {
      const res = await setActiveQuestion(activeRound.id, qId);
      if (res.data?.question) setActiveQuestionState(res.data.question);
    });
  };

  const handleSeedSamples = () => {
    if (!window.confirm('Create 3 sample rounds with 3 sample questions each?')) return;
    doAction('Seed sample rounds', () => seedSampleData());
  };

  const handleClearAllData = () => {
    if (!window.confirm('Wipe all live responses and reset the leaderboard?')) return;
    doAction('Clear all live data', () => clearAllLiveData());
  };

  const handleNextRound = async () => {
    const activeRound = rounds.find(r => r.status === 'active');
    const pendingRound = rounds.find(r => r.status === 'pending');
    if (!pendingRound && !activeRound) {
      showError('No pending or active rounds to advance to.');
      return;
    }
    doAction('Advance to Next Round', async () => {
      if (activeRound) await endRound(activeRound.id);
      if (pendingRound) await startRound(pendingRound.id);
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
          <span>Stage Master Control & Round Manager</span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleSeedSamples} className="btn-secondary flex items-center space-x-1.5 text-xs font-semibold">
            <Sparkles size={14} className="text-yellow-400" />
            <span>Seed 3 Sample Rounds</span>
          </button>
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

      {/* Admin Stage Controls & Screen Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stage Controls */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <Monitor size={16} className="text-primary-400" />
            <span>Live Stage & Question Controls</span>
          </h2>

          {/* Question-by-Question Progression */}
          <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-700 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center space-x-1"><HelpCircle size={14} className="text-primary-400" /><span>Question Progression</span></span>
              {activeRound && (
                <span className="text-primary-300 font-mono">
                  Question {roundQuestions.findIndex(q => q.id === activeQuestion?.id) + 1} of {roundQuestions.length}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePrevQuestion}
                disabled={!!actionLoading || !activeRound}
                className="flex-1 py-2 px-3 rounded-lg border border-dark-600 bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-bold flex items-center justify-center space-x-1 transition-colors disabled:opacity-40"
              >
                <SkipBack size={14} /><span>Previous Question</span>
              </button>
              <button
                onClick={handleNextQuestion}
                disabled={!!actionLoading || !activeRound}
                className="flex-1 py-2 px-3 rounded-lg border border-primary-500/40 bg-primary-500/10 hover:bg-primary-500/20 text-primary-300 text-xs font-bold flex items-center justify-center space-x-1 transition-colors disabled:opacity-40"
              >
                <span>Next Question</span><SkipForward size={14} />
              </button>
            </div>

            {/* Direct Question Selector */}
            {roundQuestions.length > 0 && (
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-xs text-slate-500 font-medium">Jump to Question:</span>
                <select
                  value={activeQuestion?.id || ''}
                  onChange={(e) => handleSelectQuestion(e.target.value)}
                  className="input-field py-1 text-xs bg-dark-800 border-dark-700 text-slate-300 flex-1"
                >
                  {roundQuestions.map((q, idx) => (
                    <option key={q.id} value={q.id}>
                      Q{idx + 1}: {q.text.length > 35 ? q.text.substring(0, 35) + '...' : q.text}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Show Leaderboard Toggle Switch */}
          <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-700 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white flex items-center space-x-2">
                <Trophy size={16} className="text-yellow-400" />
                <span>Show Leaderboard to Participants</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {showLeaderboard ? 'ON — Live scores currently broadcasted to participants' : 'OFF — Participants see GDG Club Waiting Room'}
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

          {/* Live Extra Time */}
          {activeRound && (
            <div className="p-4 rounded-xl bg-dark-900/60 border border-primary-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-primary-400 uppercase tracking-wider">
                <span className="flex items-center space-x-1"><Clock size={14} /><span>Add Live Extra Time</span></span>
                <span className="font-mono text-white">{Math.floor((parseInt(activeRound.durationSeconds) || 300) / 60)}m {((parseInt(activeRound.durationSeconds) || 300) % 60)}s total</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[10, 20, 30, 60, 120, 300].map((secs) => (
                  <button
                    key={secs}
                    onClick={() => handleExtendTime(secs)}
                    disabled={!!actionLoading}
                    className="flex-1 min-w-[54px] py-1.5 px-2 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-300 hover:bg-primary-500/20 text-xs font-mono font-bold transition-colors"
                  >
                    +{secs >= 60 ? `${secs / 60}m` : `${secs}s`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Master Action Controls */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleNextRound}
              disabled={!!actionLoading}
              className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center space-x-2"
            >
              <SkipForward size={16} />
              <span>Advance to Next Round</span>
            </button>
          </div>

          {/* Maintenance & Data Cleanup */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-dark-700">
            <button onClick={handleClearAllData} className="flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors text-xs font-semibold">
              <Trash size={14} /><span>Clear Live Responses & Scores</span>
            </button>
            <button onClick={handleEventReset} className="flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-xs font-semibold">
              <AlertTriangle size={14} /><span>Reset Event</span>
            </button>
          </div>
        </div>

        {/* Live Simulation View Mockup */}
        <div className="card bg-dark-800/80 border-primary-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-400 flex items-center space-x-1">
                <Eye size={14} /><span>Participant Device Simulation</span>
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse" />
            </div>

            {/* Smartphone Bezel Simulator Frame */}
            <div className="p-1 rounded-3xl bg-dark-950 border-[6px] border-dark-700 shadow-2xl relative h-[450px] flex flex-col justify-between overflow-hidden">
              <iframe
                src="/participant?isSimulation=true"
                className="w-full h-full border-0 rounded-2xl bg-dark-900"
                title="Participant Simulator"
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-dark-700 text-xs text-slate-500 flex justify-between items-center">
            <span>Configured Rounds: <strong className="text-slate-300">{rounds.length}</strong></span>
            <button onClick={fetchRounds} className="text-primary-400 hover:text-primary-300 font-medium flex items-center space-x-1">
              <RefreshCw size={12} /><span>Sync State</span>
            </button>
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
                    {round.durationSeconds && <span>{Math.floor(round.durationSeconds / 60)}m {(round.durationSeconds % 60)}s</span>}
                    {round.startedAt && <span>Started {isNaN(parseInt(round.startedAt, 10)) ? new Date(round.startedAt).toLocaleTimeString() : new Date(parseInt(round.startedAt, 10)).toLocaleTimeString()}</span>}
                  </div>
                </div>
              </div>

              {/* Round Actions */}
              <div className="flex flex-wrap gap-2">
                {round.status === 'pending' && (
                  <button onClick={() => doAction('Start round', () => startRound(round.id))} disabled={!!actionLoading} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-400 hover:bg-primary-500/20 transition-colors text-sm font-medium">
                    <Play size={14} /><span>Start</span>
                  </button>
                )}
                {round.status === 'active' && (
                  <>
                    <button onClick={() => doAction('Pause round', () => pauseRound(round.id))} disabled={!!actionLoading} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-sm font-medium">
                      <Pause size={14} /><span>Pause</span>
                    </button>
                    <button onClick={() => doAction('End round', () => endRound(round.id))} disabled={!!actionLoading} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors text-sm font-medium">
                      <Square size={14} /><span>End</span>
                    </button>
                  </>
                )}
                {round.status === 'paused' && (
                  <button onClick={() => doAction('Resume round', () => resumeRound(round.id))} disabled={!!actionLoading} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-400 hover:bg-primary-500/20 transition-colors text-sm font-medium">
                    <Play size={14} /><span>Resume</span>
                  </button>
                )}
                {(round.status === 'active' || round.status === 'paused' || round.status === 'ended') && (
                  <button onClick={() => doAction('Restart round', () => restartRound(round.id))} disabled={!!actionLoading} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-medium">
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
            <p className="mb-3">No rounds created yet.</p>
            <button onClick={handleSeedSamples} className="btn-primary inline-flex items-center space-x-2 text-sm">
              <Sparkles size={16} /><span>Seed 3 Sample Rounds & Questions</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
