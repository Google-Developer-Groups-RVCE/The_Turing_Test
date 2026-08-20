import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  getRounds, createRound, updateRound, deleteRound,
  startRound, pauseRound, resumeRound, restartRound, endRound, clearRoundResponses,
  extendRoundTime, resetEvent, endEvent, clearAllLiveData, getStage, reorderRounds, injectPresetRound
} from '../../api/roundApi';
import { getQuestions, getActiveQuestion, nextQuestion, previousQuestion, setActiveQuestion, overrideOption, revealPoll, reorderQuestions } from '../../api/questionApi';
import { getResponses } from '../../api/responseApi';
import { getSettings, updateSettings } from '../../api/settingsApi';
import { getAllR5AdminResponses, selectR5Candidates, showR5Results, resetR5 } from '../../api/r5Api';
import { useSocket } from '../../hooks/useSocket';
import { EventStateContext } from '../../contexts/EventStateContext';
import { SOCKET_EVENTS } from '../../utils/constants';
import ParticipantDeviceSimulation from '../../components/ParticipantDeviceSimulation';
import {
  Layers, Play, Pause, RotateCcw, Square, Plus, Edit, Trash2,
  RefreshCw, X, AlertTriangle, SkipForward, SkipBack, Eye, Trophy, Monitor, CheckCircle,
  Clock, Sparkles, Database, Trash, ChevronRight, HelpCircle, ArrowRightCircle, ChevronUp, ChevronDown, CheckSquare, Square as SquareOutline
} from 'lucide-react';

function RoundModal({ round, onClose, onSave }) {
  const [name, setName] = useState(round?.name || '');
  const [durationSeconds, setDurationSeconds] = useState(round?.durationSeconds || 300);
  const [order, setOrder] = useState(round?.order || 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Round name is required'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), durationSeconds: parseInt(durationSeconds, 10), order: parseInt(order, 10) });
      onClose();
    } catch { setError('Failed to save round'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <div className="flex items-center justify-between pb-4 border-b border-dark-700 mb-4">
          <h3 className="text-lg font-bold text-white">{round ? 'Edit Round' : 'Create New Round'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        {error && <div className="mb-4 text-xs text-rose-400 bg-rose-900/30 p-2.5 rounded border border-rose-500/30">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Round Name</label>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Round 1 — Aptitude" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Duration (Seconds)</label>
              <input type="number" min="30" className="input-field" value={durationSeconds} onChange={e => setDurationSeconds(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Order Priority</label>
              <input type="number" min="1" className="input-field" value={order} onChange={e => setOrder(e.target.value)} required />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : 'Save Round'}</button>
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
  const { setCurrentRound, setEventStatus } = useContext(EventStateContext);

  const [rounds, setRounds] = useState([]);
  const [activeQuestionState, setActiveQuestionState] = useState(null);
  const [roundQuestions, setRoundQuestions] = useState([]);
  const [responseCount, setResponseCount] = useState(0);
  const [activeStage, setActiveStage] = useState('question');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [togglingLeaderboard, setTogglingLeaderboard] = useState(false);

  // R5 Admin Selection State
  const [r5Responses, setR5Responses] = useState({});
  const [selectedR5Users, setSelectedR5Users] = useState([]);
  const [loadingR5, setLoadingR5] = useState(false);

  const getActiveRound = (list) => (list || rounds).find(r => r.status === 'active') || (list || rounds).find(r => r.status === 'paused') || null;

  const showSuccess = (m) => { setSuccess(m); setTimeout(() => setSuccess(''), 4000); };
  const showError = (m) => { setError(m); setTimeout(() => setError(''), 5000); };

  const fetchR5AdminResponses = async () => {
    setLoadingR5(true);
    try {
      const res = await getAllR5AdminResponses();
      setR5Responses(res.data?.responses || {});
    } catch {
      // ignore
    } finally {
      setLoadingR5(false);
    }
  };

  const fetchRounds = useCallback(async (isInitial = false) => {
    if (isInitial && rounds.length === 0) setLoading(true);
    try {
      const res = await getRounds();
      const list = res.data.rounds || [];
      setRounds(list);

      const active = getActiveRound(list);
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

        getStage(active.id).then(res => {
          setActiveStage(res.data?.stage || 'question');
        }).catch(() => setActiveStage('question'));
      } else {
        setActiveQuestionState(null);
        setRoundQuestions([]);
        setResponseCount(0);
        setActiveStage('question');
      }
    } catch { showError('Failed to load rounds'); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMoveRound = async (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= rounds.length) return;
    const newRounds = [...rounds];
    const temp = newRounds[idx];
    newRounds[idx] = newRounds[targetIdx];
    newRounds[targetIdx] = temp;
    setRounds(newRounds);
    const newIds = newRounds.map(r => r.id);
    try {
      await reorderRounds(newIds);
      showSuccess('Rounds reordered successfully');
    } catch {
      showError('Failed to reorder rounds');
      fetchRounds();
    }
  };

  const handleMoveQuestionInRound = async (qIdx, direction) => {
    const activeRound = getActiveRound(rounds);
    if (!activeRound) return;
    const targetIdx = direction === 'up' ? qIdx - 1 : qIdx + 1;
    if (targetIdx < 0 || targetIdx >= roundQuestions.length) return;
    const newQuestions = [...roundQuestions];
    const temp = newQuestions[qIdx];
    newQuestions[qIdx] = newQuestions[targetIdx];
    newQuestions[targetIdx] = temp;
    setRoundQuestions(newQuestions);
    const newIds = newQuestions.map(q => q.id);
    try {
      await reorderQuestions(activeRound.id, newIds);
      showSuccess('Questions reordered successfully');
    } catch {
      showError('Failed to reorder questions');
      fetchRounds();
    }
  };

  const fetchSettingsState = async () => {
    try {
      const res = await getSettings();
      if (res.data?.showLeaderboard !== undefined) {
        setShowLeaderboard(String(res.data.showLeaderboard) === 'true');
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchRounds(true);
    fetchSettingsState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Socket live updates
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchRounds();
    const handleNewResponse = () => setResponseCount(c => c + 1);
    const handleQuestionChanged = (data) => {
      if (data?.question) setActiveQuestionState(data.question);
    };

    const handleStageChanged = (data) => {
      if (data?.activeStage) setActiveStage(data.activeStage);
    };

    socket.on(SOCKET_EVENTS.ROUND_CHANGED, refresh);
    socket.on(SOCKET_EVENTS.ROUND_PAUSED, refresh);
    socket.on(SOCKET_EVENTS.ROUND_RESUMED, refresh);
    socket.on(SOCKET_EVENTS.ROUND_ENDED, refresh);
    socket.on(SOCKET_EVENTS.RESPONSE_RECEIVED, handleNewResponse);
    socket.on('question:changed', handleQuestionChanged);
    socket.on('round:stage_changed', handleStageChanged);

    return () => {
      socket.off(SOCKET_EVENTS.ROUND_CHANGED, refresh);
      socket.off(SOCKET_EVENTS.ROUND_PAUSED, refresh);
      socket.off(SOCKET_EVENTS.ROUND_RESUMED, refresh);
      socket.off(SOCKET_EVENTS.ROUND_ENDED, refresh);
      socket.off(SOCKET_EVENTS.RESPONSE_RECEIVED, handleNewResponse);
      socket.off('question:changed', handleQuestionChanged);
      socket.off('round:stage_changed', handleStageChanged);
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
    const activeRound = getActiveRound();
    if (!activeRound) {
      showError('No active round to extend time for.');
      return;
    }
    doAction(`Added +${extraSecs}s extra time`, () => extendRoundTime(activeRound.id, extraSecs));
  };

  const handleNextQuestion = async () => {
    const activeRound = getActiveRound();
    if (!activeRound) {
      showError('No active round. Please start a round first.');
      return;
    }
    doAction('Next Step', async () => {
      const res = await nextQuestion(activeRound.id);
      const data = res.data?.question;
      if (data) {
        if (data.question) {
          setActiveQuestionState(data.question);
        } else if (data.id) {
          setActiveQuestionState(data);
        }
        if (data.stage) {
          setActiveStage(data.stage);
        }
      }
    });
  };

  const handleRevealPoll = async () => {
    const activeRound = getActiveRound();
    if (!activeRound) return;
    doAction('Evaluate Poll', async () => {
      await revealPoll(activeRound.id);
    });
  };

  const handlePrevQuestion = async () => {
    const activeRound = getActiveRound();
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
    const activeRound = getActiveRound();
    if (!activeRound) return;
    doAction('Set Active Question', async () => {
      const res = await setActiveQuestion(activeRound.id, qId);
      if (res.data?.question) setActiveQuestionState(res.data.question);
    });
  };

  const handleInjectPresetRound = (roundNumber) => {
    const label = roundNumber === 'all'
      ? 'Inject All Preset Rounds (1, 2, 3)'
      : `Add Preset Round ${roundNumber}`;

    doAction(label, async () => {
      const res = await injectPresetRound(roundNumber);
      showSuccess(res.data?.message || `${label} completed successfully`);
    });
  };

  const handleClearAllData = () => {
    if (!window.confirm('Wipe all live responses and reset the leaderboard?')) return;
    doAction('Clear all live data', () => clearAllLiveData());
  };

  const handleNextRound = async () => {
    const activeRound = getActiveRound();
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

  const activeRound = getActiveRound();
  const activeQuestion = activeQuestionState; // alias used throughout JSX

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
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Rounds Injector Bar */}
          <div className="flex items-center space-x-1 bg-dark-800 p-1 rounded-xl border border-dark-700">
            <button
              onClick={() => handleInjectPresetRound('all')}
              disabled={!!actionLoading}
              className="btn-secondary py-1.5 px-3 flex items-center space-x-1.5 text-xs font-semibold hover:bg-dark-700"
              title="Add all preset rounds (Rounds 1, 2, 3, 4 & 5) without modifying existing rounds"
            >
              <Sparkles size={14} className="text-yellow-400" />
              <span>+ Add All Presets</span>
            </button>
            <div className="h-4 w-px bg-dark-600 my-auto mx-0.5" />
            <button
              onClick={() => handleInjectPresetRound(1)}
              disabled={!!actionLoading}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-dark-700 hover:text-white transition-colors"
              title="Add Preset Round 1 (Live Conversations) individually"
            >
              + R1
            </button>
            <button
              onClick={() => handleInjectPresetRound(2)}
              disabled={!!actionLoading}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-dark-700 hover:text-white transition-colors"
              title="Add Preset Round 2 (Image Challenge) individually"
            >
              + R2
            </button>
            <button
              onClick={() => handleInjectPresetRound(3)}
              disabled={!!actionLoading}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-dark-700 hover:text-white transition-colors"
              title="Add Preset Round 3 (Turing Test Speedrun / Polls) individually"
            >
              + R3
            </button>
            <button
              onClick={() => handleInjectPresetRound(4)}
              disabled={!!actionLoading}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-dark-700 hover:text-white transition-colors"
              title="Add Preset Round 4 (Spot the Hallucination) individually"
            >
              + R4
            </button>
            <button
              onClick={() => handleInjectPresetRound(5)}
              disabled={!!actionLoading}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-dark-700 hover:text-white transition-colors"
              title="Add Preset Round 5 (Reverse Turing Test) individually"
            >
              + R5
            </button>
          </div>

          <button onClick={() => setModal('create')} className="btn-primary flex items-center space-x-2 text-sm">
            <Plus size={16} /><span>New Round</span>
          </button>
          <button onClick={fetchRounds} className="p-2 rounded-lg border border-dark-600 text-slate-400 hover:text-white transition-colors" title="Sync Rounds">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Toast Notification (Floating Bottom-Right) */}
      {success && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-emerald-600/90 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border border-emerald-400/40 text-sm font-medium animate-fade-in">
          <CheckCircle size={18} className="text-emerald-200" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-2 text-white/70 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg text-sm border bg-rose-900/40 border-rose-500/40 text-rose-300 flex items-center justify-between mb-2">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-white"><X size={16} /></button>
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
                  Question {(() => {
                    const idx = roundQuestions.findIndex(q => q.id === activeQuestion?.id);
                    return idx >= 0 ? idx + 1 : (roundQuestions.length > 0 ? 1 : 0);
                  })()} of {roundQuestions.length}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePrevQuestion}
                disabled={!!actionLoading || !activeRound}
                className="flex-1 py-2 px-3 rounded-lg border border-dark-600 bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-bold flex items-center justify-center space-x-1 transition-colors disabled:opacity-40"
              >
                <SkipBack size={14} /><span>Previous</span>
              </button>
              <button
                onClick={handleNextQuestion}
                disabled={!!actionLoading || !activeRound}
                className="flex-1 py-2 px-3 rounded-lg border border-primary-500/40 bg-primary-500/10 hover:bg-primary-500/20 text-primary-300 text-xs font-bold flex items-center justify-center space-x-1 transition-colors disabled:opacity-40"
              >
                {(() => {
                  const isPoll = (
                    (activeRound && (String(activeRound.id).includes('3') || activeRound.name?.toLowerCase().includes('round 3'))) ||
                    (activeQuestion && (activeQuestion.type === 'poll' || String(activeQuestion.id).includes('poll')))
                  ) && activeQuestion?.type !== 'profile-guess' && activeQuestion?.id !== 'poll6';
                  let btnLabel = 'Next Question';
                  if (activeStage === 'question') {
                    btnLabel = isPoll ? 'Reveal Poll Result' : 'Evaluate Answer';
                  } else if (activeStage === 'evaluated') {
                    btnLabel = isPoll ? 'Next Poll Question' : 'Show Leaderboard';
                  }
                  return <span>{btnLabel}</span>;
                })()}
                <ArrowRightCircle size={14} />
              </button>
            </div>
            
            <div className="text-xs text-center py-1 font-medium text-slate-400">
              Current Stage: <span className="text-white capitalize">{activeStage}</span>
            </div>
            
            {activeRound && (String(activeRound.id).includes('round_1') || activeRound.name?.toLowerCase().includes('round 1')) && (
              <div className="pt-3 space-y-2 border-t border-dark-700 mt-2">
                {(() => {
                  const currentIdx = roundQuestions.findIndex(q => q.id === activeQuestion?.id);
                  const nextQ = currentIdx >= 0 && currentIdx < roundQuestions.length - 1 ? roundQuestions[currentIdx + 1] : null;
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400">Force Display Option for NEXT Question {nextQ ? `(Q${currentIdx + 2})` : ''}:</h4>
                        {nextQ?.displayedOptionId && (
                          <span className="text-[10px] text-primary-400 font-semibold uppercase">Set to: {nextQ.displayedOptionId.includes('human') ? 'Human' : 'Gemini'}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['Human', 'Gemini'].map(author => {
                          const overrideId = author.toLowerCase() + '-opt';
                          const isSelected = nextQ?.displayedOptionId === overrideId;
                          return (
                            <button
                              key={author}
                              onClick={() => doAction(`Force ${author} for Next Q`, () => {
                                 if (!nextQ) return Promise.reject(new Error('No next question available in this round'));
                                 return overrideOption(activeRound.id, overrideId, nextQ.id);
                              })}
                              disabled={!!actionLoading || !nextQ}
                              className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${isSelected ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-dark-800 border-dark-600 text-slate-400 hover:bg-dark-700 disabled:opacity-40'}`}
                            >
                              Force {author} (Next Q)
                            </button>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Round 5 Reverse Turing Test Admin Controls */}
            {activeRound && (String(activeRound.id).includes('round_5') || activeRound.name?.toLowerCase().includes('round 5') || activeRound.name?.toLowerCase().includes('reverse')) && (
              <div className="pt-3 space-y-3 border-t border-dark-700 mt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center space-x-1">
                    <Sparkles size={13} />
                    <span>Round 5: Human Responses ({Object.keys(r5Responses).length})</span>
                  </h4>
                  <button
                    onClick={fetchR5AdminResponses}
                    className="text-[11px] text-violet-300 hover:text-violet-200 flex items-center space-x-1 font-semibold"
                  >
                    <RefreshCw size={11} className={loadingR5 ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {Object.keys(r5Responses).length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2 text-center">No participant responses submitted yet.</p>
                  ) : (
                    Object.entries(r5Responses).map(([uName, respText]) => {
                      const isSelected = selectedR5Users.includes(uName);
                      return (
                        <div
                          key={uName}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedR5Users(selectedR5Users.filter(u => u !== uName));
                            } else {
                              if (selectedR5Users.length >= 3) {
                                showError('You can select a maximum of 3 candidate responses.');
                                return;
                              }
                              setSelectedR5Users([...selectedR5Users, uName]);
                            }
                          }}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-violet-500/20 border-violet-500/50 text-white shadow-inner'
                              : 'bg-dark-800 border-dark-700 text-slate-300 hover:bg-dark-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-violet-300">@{uName}</span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-dark-900 border border-dark-700">
                              {isSelected ? '✓ Selected' : 'Click to select'}
                            </span>
                          </div>
                          <p className="text-slate-300 text-xs italic line-clamp-2">"{respText}"</p>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => doAction('Open Voting with 3 Selected Humans', () => selectR5Candidates(selectedR5Users))}
                    disabled={!!actionLoading || selectedR5Users.length === 0}
                    className="flex-1 py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold transition-colors"
                  >
                    Open Voting with Selected ({selectedR5Users.length}/3)
                  </button>
                  <button
                    onClick={() => doAction('Reveal R5 Results', () => showR5Results())}
                    disabled={!!actionLoading}
                    className="py-2 px-3 rounded-lg bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold transition-colors"
                  >
                    Reveal Results
                  </button>
                  <button
                    onClick={() => doAction('Reset R5', () => resetR5())}
                    disabled={!!actionLoading}
                    className="py-2 px-2.5 rounded-lg bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 text-rose-300 text-xs font-bold transition-colors"
                    title="Reset Round 5 State"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Direct Question Selector & Question Rearrange */}
            {roundQuestions.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center space-x-2">
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

                <div className="pt-2 border-t border-dark-700 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400">Rearrange Active Questions Order:</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {roundQuestions.map((q, idx) => (
                      <div key={q.id} className={`flex items-center justify-between p-2 rounded-lg border text-xs ${q.id === activeQuestion?.id ? 'bg-primary-500/10 border-primary-500/40 text-primary-300' : 'bg-dark-800 border-dark-700 text-slate-400'}`}>
                        <span className="font-bold mr-2 shrink-0">Q{idx + 1}.</span>
                        <span className="truncate flex-1 font-medium">{q.text}</span>
                        <div className="flex items-center space-x-1 ml-2 shrink-0">
                          <button
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestionInRound(idx, 'up')}
                            className="p-1 rounded hover:bg-dark-700 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Move Question Up"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            disabled={idx === roundQuestions.length - 1}
                            onClick={() => handleMoveQuestionInRound(idx, 'down')}
                            className="p-1 rounded hover:bg-dark-700 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Move Question Down"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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

            {/* Native Participant Device Simulation */}
            <ParticipantDeviceSimulation />
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
                {round.status !== 'active' && (
                  <button onClick={() => doAction('Start round', () => startRound(round.id))} disabled={!!actionLoading} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-400 hover:bg-primary-500/20 transition-colors text-sm font-medium">
                    <Play size={14} /><span>Start / Activate</span>
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
                <button onClick={() => doAction('Restart round', () => restartRound(round.id))} disabled={!!actionLoading} className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-medium">
                  <RotateCcw size={14} /><span>Restart</span>
                </button>
                <button
                  onClick={() => doAction('Reset round responses', () => clearRoundResponses(round.id))}
                  disabled={!!actionLoading}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors text-sm font-medium"
                  title="Reset all user submitted answers for this round"
                >
                  <RefreshCw size={14} /><span>Reset Responses</span>
                </button>
                <div className="flex items-center space-x-1 border-r border-dark-700 pr-1 mr-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMoveRound(idx, 'up')}
                    className="p-1 rounded hover:bg-dark-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move Round Up"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    disabled={idx === rounds.length - 1}
                    onClick={() => handleMoveRound(idx, 'down')}
                    className="p-1 rounded hover:bg-dark-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move Round Down"
                  >
                    <ChevronDown size={15} />
                  </button>
                </div>
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
            <button onClick={() => setModal({})} className="btn-primary inline-flex items-center space-x-2 text-sm">
              <Plus size={16} /><span>Create New Round</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
