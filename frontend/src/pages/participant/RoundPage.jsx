import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventStateContext } from '../../contexts/EventStateContext';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { getActiveQuestion } from '../../api/questionApi';
import { getMyResponse, submitResponse } from '../../api/responseApi';
import { getCurrentRound } from '../../api/roundApi';
import { getSettings } from '../../api/settingsApi';
import { SOCKET_EVENTS } from '../../utils/constants';
import { Clock, CheckCircle, XCircle, AlertCircle, Send, Pause, RefreshCw, Lock, Sparkles } from 'lucide-react';

import round1Data from '../../data/round1Data';
import round2Data from '../../data/round2Data';
import pollsData from '../../data/pollsData';
import round4Data from '../../data/round4Data';
import round5Data from '../../data/round5Data';
import { submitR5Response, getMyR5Response, getR5Status, getR5Options, submitR5Vote, getMyR5Vote, getR5VotingStatus, getR5Results } from '../../api/r5Api';
import ChallengeCard from '../../components/ChallengeCard';
import PollCard from '../../components/PollCard';
import HallucinationCard from '../../components/HallucinationCard';

const allRichData = [...round1Data, ...round2Data, ...pollsData, ...round4Data, ...round5Data];

export default function RoundPage() {
  const { currentRound, eventStatus, activeStage, setCurrentRound, setEventStatus } = useContext(EventStateContext);
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [profileGuess, setProfileGuess] = useState({ age: '', profession: '', hobby: '' });
  const [myResponse, setMyResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [pollResult, setPollResult] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);

  // Round 5 state
  const [r5Phase, setR5Phase] = useState('prompt');
  const [r5Response, setR5Response] = useState('');
  const [r5Submitted, setR5Submitted] = useState(false);
  const [r5Options, setR5Options] = useState([]);
  const [r5SelectedVote, setR5SelectedVote] = useState(null);
  const [r5Voted, setR5Voted] = useState(false);
  const [r5Results, setR5Results] = useState(null);
  const [r5Status, setR5Status] = useState(null);
  const [r5Submitting, setR5Submitting] = useState(false);

  const currentRoundRef = React.useRef(currentRound);
  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);

  const fetchQuestion = useCallback(async () => {
    if (!question) setLoading(true);
    try {
      const [rRes, settingsRes] = await Promise.all([
        getCurrentRound().catch(() => null),
        getSettings().catch(() => null)
      ]);
      if (settingsRes?.data?.settings) {
        setAllowLateSubmission(String(settingsRes.data.settings.allowLateSubmission) === 'true');
      }
      const roundToUse = rRes?.data?.round || (rRes?.data?.id ? rRes.data : currentRoundRef.current);
      
      if (roundToUse) {
        if (!currentRoundRef.current || currentRoundRef.current.id !== roundToUse.id || currentRoundRef.current.status !== roundToUse.status) {
          setCurrentRound(roundToUse);
        }
        setEventStatus(roundToUse.status === 'active' ? 'running' : roundToUse.status === 'paused' ? 'paused' : roundToUse.status === 'ended' ? 'ended' : 'idle');
      }

      const roundId = typeof roundToUse === 'string' ? roundToUse : roundToUse?.id;
      if (!roundId || roundToUse?.status !== 'active') {
        setQuestion(null);
        setPollResult(null);
        setEvaluationData(null);
        setLoading(false);
        return;
      }

      const qRes = await getActiveQuestion(roundId).catch(() => null);
      let q = null;
      if (qRes?.data) {
        const qData = qRes.data;
        q = qData?.question || (Array.isArray(qData) ? qData[0] : (qData?.id ? qData : null));
        setQuestion(q || null);
        if (q?.pollResult) setPollResult(q.pollResult);
        else setPollResult(null);
        if (q?.evaluationData) setEvaluationData(q.evaluationData);
        else setEvaluationData(null);
      } else {
        setQuestion(null);
        setPollResult(null);
        setEvaluationData(null);
      }

      if (q?.id) {
        const respRes = await getMyResponse(roundId, q.id).catch(() => null);
        if (respRes?.data) {
          const resp = respRes.data?.response || (respRes.data?.answer ? respRes.data : null);
          setMyResponse(resp || null);
          if (resp?.answer) {
            setSelectedAnswer(resp.answer);
            setTextAnswer(resp.answer);
          }
        } else {
          setMyResponse(null);
        }
      } else {
        setMyResponse(null);
      }
    } catch {
      setQuestion(null);
      setMyResponse(null);
    } finally {
      setLoading(false);
    }
  }, [setCurrentRound, setEventStatus]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  // Transition to Leaderboard or Waiting Room if not active
  useEffect(() => {
    const isSim = window.location.pathname.startsWith('/simulation');
    const basePath = isSim ? '/simulation' : '/participant';
    if (activeStage === 'leaderboard') {
      navigate(`${basePath}/leaderboard`, { replace: true });
    } else if (!loading && (!currentRound || currentRound.status !== 'active')) {
      navigate(basePath, { replace: true });
    }
  }, [activeStage, currentRound, loading, navigate]);

  // Socket: round changed & question changed — update question live
  useEffect(() => {
    if (!socket) return;
    let roundEndTimer = null;

    const handleRoundChanged = (data) => {
      // A new round started — cancel any pending leaderboard navigation
      if (roundEndTimer) {
        clearTimeout(roundEndTimer);
        roundEndTimer = null;
      }
      if (data?.roundData) {
        setCurrentRound(data.roundData);
      }
      setPollResult(null);
      setEvaluationData(null);
      setSelectedAnswer('');
      setTextAnswer('');
      setMyResponse(null);
      setError('');
      fetchQuestion();
    };
    const handleQuestionChanged = (data) => {
      if (data?.question) {
        const newQ = { ...data.question, startedAt: data.startedAt || data.question.startedAt || Date.now() };
        setQuestion(newQ);
        setSelectedAnswer('');
        setTextAnswer('');
        setMyResponse(null);
        setEvaluationData(null);
        setPollResult(null);
        setError('');
        setCurrentRound(prev => prev ? { ...prev, startedAt: data.startedAt || newQ.startedAt } : prev);
      } else {
        setPollResult(null);
        setEvaluationData(null);
        fetchQuestion();
      }
    };
    const handleTimeExtended = (data) => {
      if (data?.newDurationSeconds) {
        setCurrentRound((prev) => prev ? { ...prev, durationSeconds: data.newDurationSeconds } : prev);
      }
    };
    const handlePollRevealed = (data) => {
      if (data?.result) {
        setPollResult(data.result);
      }
    };
    const handleQuestionEvaluate = async (data) => {
      if (data?.evaluationData) {
        setEvaluationData(data.evaluationData);
        // Re-fetch latest response to ensure pointsAwarded is populated
        if (currentRoundRef.current?.id && data.evaluationData.questionId) {
          try {
            const respRes = await getMyResponse(currentRoundRef.current.id, data.evaluationData.questionId);
            if (respRes?.data) {
              const resp = respRes.data?.response || (respRes.data?.answer ? respRes.data : null);
              if (resp) setMyResponse(resp);
            }
          } catch {}
        }
      }
    };
    const handleResponsesCleared = () => {
      setSelectedAnswer('');
      setTextAnswer('');
      setMyResponse(null);
      setEvaluationData(null);
      setPollResult(null);
      setProfileGuess({ age: '', profession: '', hobby: '' });
      fetchQuestion();
    };
    const handleRoundEnded = () => {
      // Don't navigate immediately — wait for a possible next round to auto-start
      roundEndTimer = setTimeout(() => {
        // If no new round started within 3s, navigate to leaderboard
        const isSim = window.location.pathname.startsWith('/simulation');
        const basePath = isSim ? '/simulation' : '/participant';
        navigate(`${basePath}/leaderboard`, { replace: true });
      }, 3000);
    };

    const handleSettingsUpdated = (data) => {
      if (data && data.allowLateSubmission !== undefined) {
        setAllowLateSubmission(String(data.allowLateSubmission) === 'true');
      }
    };

    socket.on(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
    socket.on('question:changed', handleQuestionChanged);
    socket.on('round:time_extended', handleTimeExtended);
    socket.on('poll:revealed', handlePollRevealed);
    socket.on('question:evaluate', handleQuestionEvaluate);
    socket.on('responses:cleared', handleResponsesCleared);
    socket.on('round:ended', handleRoundEnded);
    socket.on('settings:updated', handleSettingsUpdated);

    return () => {
      if (roundEndTimer) clearTimeout(roundEndTimer);
      socket.off(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
      socket.off('question:changed', handleQuestionChanged);
      socket.off('round:time_extended', handleTimeExtended);
      socket.off('poll:revealed', handlePollRevealed);
      socket.off('question:evaluate', handleQuestionEvaluate);
      socket.off('responses:cleared', handleResponsesCleared);
      socket.off('round:ended', handleRoundEnded);
      socket.off('settings:updated', handleSettingsUpdated);
    };
  }, [socket, fetchQuestion, setCurrentRound, navigate]);

  // Round 5 detection and socket listeners
  const isRound5 = question?.type === 'reverse-turing';

  useEffect(() => {
    if (!isRound5) return;
    // Fetch R5 state on mount
    const fetchR5State = async () => {
      try {
        const [statusRes, myRespRes, myVoteRes] = await Promise.allSettled([
          getR5Status(), getMyR5Response(), getMyR5Vote()
        ]);
        if (statusRes.status === 'fulfilled') setR5Status(statusRes.value.data);
        if (myRespRes.status === 'fulfilled' && myRespRes.value.data?.text) {
          setR5Response(myRespRes.value.data.text);
          setR5Submitted(true);
        }
        if (myVoteRes.status === 'fulfilled' && myVoteRes.value.data?.optionIndex !== undefined) {
          setR5SelectedVote(myVoteRes.value.data.optionIndex);
          setR5Voted(true);
        }
      } catch {}
      // Fetch current phase
      try {
        const statusRes = await getR5Status();
        if (statusRes.data?.phase) setR5Phase(statusRes.data.phase);
      } catch {}
      // If voting phase, fetch options
      try {
        const optRes = await getR5Options();
        if (optRes.data?.options) setR5Options(optRes.data.options);
      } catch {}
      // If results phase, fetch results
      try {
        const resRes = await getR5Results();
        if (resRes.data?.results) setR5Results(resRes.data.results);
      } catch {}
    };
    fetchR5State();
  }, [isRound5]);

  useEffect(() => {
    if (!socket || !isRound5) return;
    const handlePhaseChanged = (data) => {
      if (data?.phase) setR5Phase(data.phase);
    };
    const handleVotingOpened = async (data) => {
      setR5Phase('voting');
      if (data?.options) setR5Options(data.options);
    };
    const handleResults = (data) => {
      setR5Phase('results');
      if (data?.results) setR5Results(data.results);
    };
    const handleR5ResponseReceived = async () => {
      try {
        const statusRes = await getR5Status();
        if (statusRes.data) setR5Status(statusRes.data);
      } catch {}
    };
    const handleR5VoteReceived = async () => {
      try {
        const statusRes = await getR5VotingStatus();
        if (statusRes.data) setR5Status(prev => ({ ...prev, ...statusRes.data }));
      } catch {}
    };
    socket.on('r5:phase_changed', handlePhaseChanged);
    socket.on('r5:voting_opened', handleVotingOpened);
    socket.on('r5:results', handleResults);
    socket.on('r5:response_received', handleR5ResponseReceived);
    socket.on('r5:vote_received', handleR5VoteReceived);
    return () => {
      socket.off('r5:phase_changed', handlePhaseChanged);
      socket.off('r5:voting_opened', handleVotingOpened);
      socket.off('r5:results', handleResults);
      socket.off('r5:response_received', handleR5ResponseReceived);
      socket.off('r5:vote_received', handleR5VoteReceived);
    };
  }, [socket, isRound5]);

  // Countdown timer per question / phase
  useEffect(() => {
    // If answer is being evaluated or poll revealed, freeze/stop timer
    if (evaluationData || pollResult) {
      return;
    }

    // Determine the active duration: prioritize question duration, then fallback to round duration
    const qDuration = parseInt(question?.durationSeconds, 10);
    const rDuration = parseInt(currentRound?.durationSeconds, 10);
    const duration = (!isNaN(qDuration) && qDuration > 0) ? qDuration : ((!isNaN(rDuration) && rDuration > 0) ? rDuration : 120);

    const startedAtMs = Number(question?.startedAt) || Number(currentRound?.startedAt) || Date.now();
    if (!startedAtMs || isNaN(startedAtMs)) return;

    const endTime = startedAtMs + duration * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [currentRound, question, evaluationData, pollResult]);

  const handleSubmit = async () => {
    if (myResponse) return; // Prevent duplicate submissions
    const answer = selectedAnswer || textAnswer;
    if (!answer || (typeof answer === 'string' && !answer.trim())) {
      setError('Please select an option or type your answer before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');
    const roundId = typeof currentRound === 'string' ? currentRound : currentRound?.id;
    try {
      const res = await submitResponse(roundId, answer.trim());
      const savedResp = res.data?.response || { answer: answer.trim(), submittedAt: Date.now() };
      setMyResponse(savedResp);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleR5Submit = async () => {
    if (r5Submitted || r5Submitting || !r5Response.trim()) return;
    setR5Submitting(true);
    try {
      await submitR5Response(r5Response.trim());
      setR5Submitted(true);
      // Refresh status
      const statusRes = await getR5Status();
      if (statusRes.data) setR5Status(statusRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit response');
    } finally {
      setR5Submitting(false);
    }
  };

  const handleR5Vote = async () => {
    if (r5Voted || r5Submitting || r5SelectedVote === null) return;
    setR5Submitting(true);
    try {
      await submitR5Vote(r5SelectedVote);
      setR5Voted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit vote');
    } finally {
      setR5Submitting(false);
    }
  };

  const formatTime = (secs) => {
    if (secs === null) return null;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isTimeUp = timeLeft !== null && timeLeft <= 0;
  const isLocked = !!myResponse || submitting || (isTimeUp && !allowLateSubmission);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-slate-400">Loading round...</p>
        </div>
      </div>
    );
  }

  if (eventStatus === 'paused') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
        <div className="p-5 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mb-4">
          <Pause size={40} className="text-yellow-400 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-yellow-300 mb-2">Round Paused</h2>
        <p className="text-slate-400">The admin has paused the round. Please wait for it to resume.</p>
        {myResponse && (
          <div className="mt-6 card max-w-sm w-full">
            <p className="text-sm text-slate-400">Your answer was recorded:</p>
            <p className="text-white font-medium mt-1">{myResponse.answer}</p>
          </div>
        )}
      </div>
    );
  }

  if (!currentRound || currentRound.status !== 'active' || !question) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4">
        <div className="p-5 rounded-full bg-primary-500/10 border border-primary-500/30 mb-6 shadow-[0_0_30px_rgba(14,165,233,0.2)]">
          <Sparkles size={48} className="text-primary-400 animate-pulse" />
        </div>
        <h2 className="font-['Borghan'] text-3xl md:text-5xl font-bold text-white mb-3 tracking-wide">
          The Turing Test
        </h2>
        <p className="text-slate-400 max-w-md text-sm md:text-base leading-relaxed mb-8">
          Welcome to GDG RVCE's Turing Test Arena. Please stay tuned — the host will start the round shortly!
        </p>
        <button
          onClick={fetchQuestion}
          className="btn-primary px-6 py-3 text-sm font-semibold flex items-center space-x-2 shadow-lg"
        >
          <RefreshCw size={16} />
          <span>Sync Live Status</span>
        </button>
      </div>
    );
  }

  if (isRound5) {
    // ROUND 5 — REVERSE TURING TEST COMPLETE UI
    // Phase 1: Prompt
    if (r5Phase === 'prompt') {
      return (
        <div className="flex-1 flex flex-col space-y-6 py-4 max-w-3xl mx-auto w-full animate-fade-in">
          {/* Round Header */}
          <div className="w-full bg-gradient-to-br from-violet-900/30 via-dark-900/90 to-purple-950/30 border-2 border-violet-500/40 rounded-3xl p-8 shadow-[0_0_50px_rgba(139,92,246,0.25)] backdrop-blur-md">
            <div className="inline-flex items-center space-x-2 bg-violet-500/20 border border-violet-400/30 px-4 py-1.5 rounded-full mb-4">
              <Sparkles size={14} className="text-violet-300 animate-pulse" />
              <span className="text-violet-300 text-xs font-extrabold uppercase tracking-widest">Reverse Turing Test</span>
            </div>
            <h2 className="font-['Borghan'] text-2xl md:text-4xl font-bold text-white tracking-wide mb-3">Write Like an AI</h2>
            <p className="text-slate-400 text-sm leading-relaxed">Can you write a response so convincing that others think it was written by Gemini? Your response will be shuffled with Gemini's actual answer — try to fool everyone!</p>
          </div>

          {/* Prompt Card */}
          <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-3">The Prompt</p>
            <h3 className="text-white text-xl md:text-2xl font-bold italic leading-relaxed">
              "{question?.text || 'Write a short 2-sentence motivational quote for someone studying for finals at 3 AM'}"
            </h3>
          </div>

          {/* Response Input or Submitted State */}
          {!r5Submitted ? (
            <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your AI-style Response</p>
              <textarea
                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none min-h-[120px] resize-none transition-all"
                placeholder="Write your most convincing AI-like response here..."
                value={r5Response}
                onChange={(e) => setR5Response(e.target.value)}
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{r5Response.length}/500</span>
              </div>
              {error && <p className="text-rose-400 text-sm">{error}</p>}
              <button
                onClick={handleR5Submit}
                disabled={r5Submitting || !r5Response.trim()}
                className="relative overflow-hidden font-['Cutepunch'] text-xl tracking-widest py-3 px-10 rounded-full bg-gradient-to-br from-violet-500 via-violet-600 to-purple-600 text-white shadow-[0_4px_20px_rgba(139,92,246,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all hover:-translate-y-0.5 hover:scale-105 active:translate-y-px active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 w-full"
              >
                {r5Submitting ? (
                  <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg><span>Submitting...</span></>
                ) : (
                  <><Send size={18} /><span>Submit Response</span></>
                )}
              </button>
            </div>
          ) : (
            <div className="w-full bg-violet-950/40 border border-violet-500/40 rounded-xl p-6 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle size={24} className="text-violet-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">Response Submitted!</h4>
                  <p className="text-xs text-slate-400">Waiting for other participants to finish writing...</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-slate-300 text-sm italic">"{r5Response}"</p>
              </div>
              {r5Status && (
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  <span>{r5Status.totalSubmitted || 0} / {r5Status.totalExpected || '?'} participants submitted</span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Phase 2: Voting
    if (r5Phase === 'voting') {
      return (
        <div className="flex-1 flex flex-col space-y-6 py-4 max-w-3xl mx-auto w-full animate-fade-in">
          <div className="w-full bg-gradient-to-br from-violet-900/30 via-dark-900/90 to-purple-950/30 border-2 border-violet-500/40 rounded-3xl p-8 shadow-[0_0_50px_rgba(139,92,246,0.25)] backdrop-blur-md text-center">
            <div className="inline-flex items-center space-x-2 bg-violet-500/20 border border-violet-400/30 px-4 py-1.5 rounded-full mb-4">
              <span className="text-violet-300 text-xs font-extrabold uppercase tracking-widest animate-pulse">★ Vote Now</span>
            </div>
            <h2 className="font-['Borghan'] text-2xl md:text-3xl font-bold text-white tracking-wide mb-2">Which Response is Gemini's?</h2>
            <p className="text-slate-400 text-sm">One of these was written by Gemini AI. The rest are from your fellow participants. Vote for the one you think is AI-generated!</p>
          </div>

          {!r5Voted ? (
            <>
              <div className="space-y-4">
                {r5Options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setR5SelectedVote(opt.index)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 backdrop-blur-md ${
                      r5SelectedVote === opt.index
                        ? 'border-violet-400 bg-violet-500/20 shadow-[0_0_25px_rgba(139,92,246,0.3)]'
                        : 'border-white/10 bg-white/5 hover:border-violet-500/50 hover:bg-violet-500/10'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        r5SelectedVote === opt.index ? 'bg-violet-500 text-white' : 'bg-white/10 text-slate-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <p className="text-slate-200 text-sm md:text-base leading-relaxed flex-1">{opt.text}</p>
                    </div>
                  </button>
                ))}
              </div>
              {error && <p className="text-rose-400 text-sm text-center">{error}</p>}
              <button
                onClick={handleR5Vote}
                disabled={r5Submitting || r5SelectedVote === null}
                className="relative overflow-hidden font-['Cutepunch'] text-xl tracking-widest py-3 px-10 rounded-full bg-gradient-to-br from-violet-500 via-violet-600 to-purple-600 text-white shadow-[0_4px_20px_rgba(139,92,246,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all hover:-translate-y-0.5 hover:scale-105 active:translate-y-px active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 w-full"
              >
                {r5Submitting ? (
                  <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg><span>Submitting Vote...</span></>
                ) : (
                  <><Send size={18} /><span>Cast Your Vote</span></>
                )}
              </button>
            </>
          ) : (
            <div className="w-full bg-violet-950/40 border border-violet-500/40 rounded-xl p-6 shadow-xl backdrop-blur-md text-center space-y-3">
              <CheckCircle size={48} className="text-violet-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">Vote Cast!</h3>
              <p className="text-slate-400 text-sm">Waiting for everyone to vote and for the host to reveal results...</p>
            </div>
          )}
        </div>
      );
    }

    // Phase 3: Results
    if (r5Phase === 'results' && r5Results) {
      const totalVotes = r5Results.reduce((sum, r) => sum + (r.voteCount || 0), 0);
      return (
        <div className="flex-1 flex flex-col space-y-6 py-4 max-w-3xl mx-auto w-full animate-fade-in">
          <div className="w-full bg-gradient-to-br from-violet-900/30 via-dark-900/90 to-purple-950/30 border-2 border-violet-500/40 rounded-3xl p-8 shadow-[0_0_50px_rgba(139,92,246,0.25)] backdrop-blur-md text-center">
            <div className="inline-flex items-center space-x-2 bg-violet-500/20 border border-violet-400/30 px-4 py-1.5 rounded-full mb-4">
              <Sparkles size={14} className="text-violet-300" />
              <span className="text-violet-300 text-xs font-extrabold uppercase tracking-widest">Results Revealed</span>
            </div>
            <h2 className="font-['Borghan'] text-2xl md:text-3xl font-bold text-white tracking-wide">The Verdict Is In</h2>
          </div>

          <div className="space-y-4">
            {r5Results.map((result, idx) => {
              const pct = totalVotes > 0 ? Math.round((result.voteCount / totalVotes) * 100) : 0;
              return (
                <div
                  key={idx}
                  className={`w-full rounded-2xl border-2 p-5 backdrop-blur-md transition-all ${
                    result.isGemini
                      ? 'border-emerald-400/60 bg-emerald-950/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {result.isGemini ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">✨ Gemini AI</span>
                      ) : (
                        <span className="text-sm font-bold text-slate-300">@{result.username}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-mono font-bold text-white">{pct}%</span>
                      <span className="text-xs text-slate-500 ml-1">({result.voteCount} vote{result.voteCount !== 1 ? 's' : ''})</span>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">{result.text}</p>
                  <div className="w-full h-2 rounded-full bg-dark-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${result.isGemini ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-violet-500 to-purple-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Fallback: waiting for results
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
        <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400">Waiting for the host...</p>
      </div>
    );
  }

  if (pollResult) {
    const getRichData = () => {
      if (!question) return null;
      const rName = (currentRound?.name || '').toLowerCase();
      const rId = String(currentRound?.id || '').toLowerCase();

      let dataset = [];
      if (question.type === 'poll' || question.type === 'profile-guess' || rId.includes('r3') || rId.includes('round_3') || rName.includes('round 3') || rName.includes('poll') || rName.includes('decode') || rName.includes('speedrun')) {
        dataset = pollsData;
      } else if (question.type === 'mcq' && (rId.includes('r4') || rId.includes('round_4') || rName.includes('round 4') || rName.includes('hallucination'))) {
        dataset = round4Data;
      } else if (rId.includes('r2') || rId.includes('round_2') || rName.includes('round 2') || rName.includes('coding') || rName.includes('image challenge')) {
        dataset = round2Data;
      } else if (rId.includes('r1') || rId.includes('round_1') || rName.includes('round 1') || rName.includes('aptitude') || rName.includes('live conversation')) {
        dataset = round1Data;
      } else {
        dataset = allRichData;
      }

      return dataset.find((d) => d.id === question.id || (d.order && Number(d.order) === Number(question.order))) ||
             allRichData.find((d) => d.id === question.id);
    };
    const richData = getRichData();

    return (
      <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center w-full max-w-2xl mx-auto animate-fade-in">
        <div className="w-full bg-gradient-to-br from-purple-900/30 via-dark-900/90 to-purple-950/30 border-2 border-purple-500/40 rounded-3xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.25)] backdrop-blur-md">
          <div className="inline-flex items-center space-x-2 bg-purple-500/20 border border-purple-400/30 px-4 py-1.5 rounded-full mb-6">
            <span className="text-purple-300 text-xs font-extrabold uppercase tracking-widest animate-pulse">
              ★ Live Poll Reveal
            </span>
          </div>

          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            Most Voted Question (Option {pollResult.winningKey})
          </h3>
          
          <h2 className="text-white text-xl md:text-2xl font-bold italic leading-relaxed mb-8 px-2">
            "{pollResult.winningQuestionText || (richData && richData.options.find(o => o.key === pollResult.winningKey)?.question) || 'Decoded Question'}"
          </h2>

          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent mb-8"></div>

          <div className="p-6 rounded-2xl bg-dark-950/80 border border-purple-500/30 text-left shadow-inner">
            <span className="text-xs font-extrabold text-purple-400 block uppercase tracking-wider mb-3">
              Gemini's Decoded Response:
            </span>
            <p className="text-emerald-300 text-base md:text-lg font-medium leading-relaxed">
              "{pollResult.answerText}"
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-6 py-4 max-w-3xl mx-auto w-full">
      {/* Round Header */}
      <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary-400">
            {currentRound?.name || 'Current Round'}
          </span>
          <h2 className="text-lg font-bold text-white mt-0.5">
            {question.type === 'hallucination' ? 'Spot the Hallucination' : question.type === 'mcq' ? 'Multiple Choice Question' : question.type === 'poll' ? 'Live Poll' : question.type === 'guess-author' ? 'Guess the Author' : 'Short Answer Question'}
          </h2>
        </div>
        <div className="flex items-center space-x-3">
          {/* Points Allotted Badge */}
          {question.type !== 'poll' && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-bold shadow-sm">
              <Sparkles size={16} className="text-amber-400" />
              <span>{question.points || 10} Points</span>
            </div>
          )}

          {timeLeft !== null && (
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-mono text-lg font-bold border
              ${timeLeft < 30 ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-glass-border bg-glass-bg text-primary-300'}
            `}>
              <Clock size={18} className={timeLeft < 30 ? 'text-rose-400 animate-pulse' : 'text-primary-400'} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Submitted Feedback Banner */}
      {!evaluationData && myResponse && (
        <div className="p-4 rounded-xl border border-primary-500/40 bg-primary-950/40 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <CheckCircle size={24} className="text-primary-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Answer Submitted & Locked</h4>
              <p className="text-xs text-slate-400">Your choice has been recorded. Wait for the round to conclude.</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs text-slate-500 font-mono">
            <Lock size={13} />
            <span>Locked</span>
          </div>
        </div>
      )}

      {/* Time Expired Banner (When no response submitted and late submissions disabled) */}
      {!evaluationData && !myResponse && isTimeUp && !allowLateSubmission && (
        <div className="p-4 rounded-xl border border-rose-500/50 bg-rose-950/50 flex items-center justify-between backdrop-blur-md animate-fade-in shadow-[0_0_20px_rgba(244,63,94,0.25)]">
          <div className="flex items-center space-x-3">
            <AlertCircle size={26} className="text-rose-400 animate-pulse" />
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">⏳ Time is Up!</h4>
              <p className="text-xs text-rose-300/90">Submissions for this question are now closed. Wait for the host to advance.</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs text-rose-300 font-mono font-bold bg-rose-900/60 px-3 py-1 rounded-lg border border-rose-500/40">
            <Lock size={13} />
            <span>Closed</span>
          </div>
        </div>
      )}

      {/* Evaluation View */}
      {evaluationData && question.type !== 'hallucination' && (
        <div className="w-full bg-dark-900/80 border border-white/10 rounded-xl p-8 shadow-2xl backdrop-blur-md flex flex-col items-center text-center">
          {(() => {
            const ptsEarned = parseInt(myResponse?.pointsAwarded) || 0;
            const isCorrect = (myResponse && String(myResponse.isCorrect) === 'true') || ptsEarned > 0 || (myResponse && String(myResponse.answer).toLowerCase() === String(evaluationData.correctAnswer).toLowerCase());
            const skipped = evaluationData.skipped;
            
            if (skipped) {
              return (
                <>
                  <AlertCircle size={64} className="text-slate-400 mb-4" />
                  <h2 className="text-3xl font-bold text-white mb-2">Round Concluded</h2>
                  <p className="text-slate-400">Waiting for the next question...</p>
                </>
              );
            }
            
            return (
              <>
                {isCorrect ? (
                  <CheckCircle size={72} className="text-emerald-400 mb-4 animate-bounce" />
                ) : (
                  <XCircle size={72} className="text-rose-500 mb-4 animate-pulse" />
                )}
                
                <h2 className={`text-4xl font-extrabold tracking-wide mb-1 ${isCorrect ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {isCorrect ? (ptsEarned > 0 && ptsEarned < (parseInt(question.points) || 30) ? 'Partially Correct!' : 'Correct!') : 'Incorrect'}
                </h2>

                {myResponse && (
                  <div className={`mt-2 px-4 py-1.5 rounded-full border text-sm font-bold inline-flex items-center space-x-1.5 ${
                    ptsEarned > 0 ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                  }`}>
                    <Sparkles size={14} />
                    <span>+{ptsEarned} Points Awarded (out of {question.points || 10} pts)</span>
                  </div>
                )}
                
                <div className="w-full mt-6 space-y-4 text-left">
                  <div className="p-4 rounded-xl bg-dark-800 border border-dark-600">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Your Answer</p>
                    <p className={`text-lg font-medium font-mono ${isCorrect ? 'text-emerald-300' : 'text-rose-400'}`}>
                      {myResponse?.answer || 'No answer submitted'}
                    </p>
                  </div>
                  {evaluationData.correctAnswer && (
                    <div className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/30">
                      <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">Official Solution / Benchmark Target</p>
                      <p className="text-lg font-medium text-emerald-400 font-mono">
                        {evaluationData.correctAnswer}
                      </p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Poll Result View */}
      {pollResult && (
        <div className="w-full bg-dark-900/80 border border-purple-500/30 rounded-xl p-8 shadow-2xl backdrop-blur-md flex flex-col items-center text-center">
          <Sparkles size={64} className="text-purple-400 mb-4 animate-pulse" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Community Choice</h2>
          
          <div className="w-full mt-6 p-6 rounded-2xl bg-purple-900/20 border border-purple-500/40 text-left shadow-[0_0_30px_rgba(168,85,247,0.15)]">
            <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-3">Majority Voted Question</p>
            <p className="text-xl font-medium text-white leading-relaxed">"{pollResult.winningQuestionText || question.text}"</p>
            
            <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/50 to-transparent my-6" />
            
            <p className="text-xs text-pink-400 font-bold uppercase tracking-wider mb-3">Corresponding Answer</p>
            <p className="text-lg font-medium text-purple-100 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
              {pollResult.answerText}
            </p>
          </div>
          
          {Object.keys(pollResult.counts || {}).length > 0 && (
            <div className="w-full mt-6 flex justify-center space-x-4">
              {Object.entries(pollResult.counts || {}).sort((a,b) => b[1]-a[1]).map(([key, count]) => (
                <div key={key} className={`px-5 py-3 rounded-xl border ${key === pollResult.winningKey ? 'bg-purple-600/30 border-purple-400 shadow-lg' : 'bg-dark-800 border-dark-600'} text-center`}>
                  <div className="text-xs text-slate-400 font-bold mb-1">Option {key}</div>
                  <div className="text-xl text-white font-mono font-bold">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* Question Card & Answer Section */}
      {!evaluationData && !pollResult && (() => {
        if (question.type === 'poll') {
          return (
            <PollCard 
              poll={question} 
              selectedOption={selectedAnswer} 
              onSelect={!isLocked ? setSelectedAnswer : () => {}} 
            />
          );
        }
        if (question.type === 'hallucination') {
          return <HallucinationCard question={question} evaluationData={null} />;
        }
        if (question.type === 'profile-guess' || question.id === 'poll6') {
          const handleProfileChange = (field, val) => {
            const next = { ...profileGuess, [field]: val };
            setProfileGuess(next);
            const str = `Age: ${next.age} | Profession: ${next.profession} | Hobby: ${next.hobby}`;
            setSelectedAnswer(str);
            setTextAnswer(str);
          };

          const pollHistory = question.revealedPollHistory || [];

          return (
            <div className="w-full space-y-6">
              {/* Revealed Clues from Polls 1–5 */}
              <div className="w-full bg-dark-900/90 border border-purple-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles size={18} className="text-purple-400" />
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">Revealed Clues Summary (Polls 1–5)</h3>
                  </div>
                  <span className="text-xs text-purple-300 font-mono bg-purple-900/50 px-2.5 py-1 rounded-full border border-purple-500/30">
                    {pollHistory.length > 0 ? `${pollHistory.length} Clues Available` : 'Default Clues'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pollHistory.length > 0 ? (
                    pollHistory.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-dark-800/80 border border-purple-500/20 space-y-1.5 text-left">
                        <div className="flex items-center justify-between text-xs font-bold text-purple-400">
                          <span>Poll {item.pollOrder || (idx + 1)} Winner (Option {item.winningKey || 'A'})</span>
                        </div>
                        <p className="text-xs font-semibold text-white">"{item.question}"</p>
                        <p className="text-xs text-slate-300 italic bg-black/30 p-2 rounded-lg border border-white/5">
                          "{item.answer}"
                        </p>
                      </div>
                    ))
                  ) : (
                    // Default fallback if participants jump straight to Q6
                    [
                      { poll: "1. Daily Life", q: "What does a perfect Sunday look like for you?", a: "A slow morning, a good lunch, maybe getting a few things done, and a quiet evening. I've started appreciating days where absolutely nothing interesting happens." },
                      { poll: "2. Memories", q: "What's a change in everyday life that still amazes you?", a: "Probably how many separate things have quietly disappeared into one device. I used to think of maps, music, photographs and payments as completely unrelated things." },
                      { poll: "3. Work & Thinking", q: "What's the most tiring part of your work?", a: "Probably revisiting the same information repeatedly. Sometimes one detail that seemed insignificant at first changes how everything else fits together." },
                      { poll: "4. Perspective", q: "What's something you find interesting about conversations?", a: "How differently two people can remember the same situation. Neither person necessarily thinks they're wrong, but the details can still be surprisingly different." },
                      { poll: "5. Hobbies", q: "When you visit somewhere new, what do you usually do first?", a: "Usually walk around without deciding too much beforehand. I tend to notice smaller details and occasionally end up spending far too long in places other people pass through quickly." }
                    ].map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-dark-800/80 border border-purple-500/20 space-y-1 text-left">
                        <span className="text-[11px] font-bold text-purple-400">{item.poll}</span>
                        <p className="text-xs font-semibold text-white">"{item.q}"</p>
                        <p className="text-xs text-slate-300 italic bg-black/30 p-2 rounded-lg border border-white/5">
                          "{item.a}"
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Submission Form */}
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md space-y-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{question.text || "Round 2 — Decode the Hidden Profile"}</h2>
                <p className="text-sm text-slate-400 italic">Based on the clues revealed above, submit your final guess for Gemini's hidden profile (4 minutes):</p>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary-400 mb-1">1. Predicted Age (Numerical)</label>
                    <input
                      type="number"
                      disabled={isLocked}
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white placeholder-slate-500 focus:border-sky-500 outline-none"
                      placeholder="e.g. 47"
                      value={profileGuess.age}
                      onChange={(e) => handleProfileChange('age', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary-400 mb-1">2. Predicted Profession</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white placeholder-slate-500 focus:border-sky-500 outline-none"
                      placeholder="e.g. Lawyer"
                      value={profileGuess.profession}
                      onChange={(e) => handleProfileChange('profession', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary-400 mb-1">3. Predicted Hobby</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white placeholder-slate-500 focus:border-sky-500 outline-none"
                      placeholder="e.g. Photography"
                      value={profileGuess.hobby}
                      onChange={(e) => handleProfileChange('hobby', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (question.type === 'guess-author') {
          const displayedOpt = question.options?.find(o => o.id === question.displayedOptionId) || question.options?.[0];
          return (
            <>
              <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md">
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-4">{question.text}</h2>
                <div className="mt-4 p-4 rounded-xl border border-primary-500/30 bg-dark-900/60 shadow-inner">
                  <h3 className="text-xs font-bold text-primary-400 uppercase tracking-wider mb-2">Response to Evaluate</h3>
                  <p className="text-slate-200 text-lg italic leading-relaxed">"{displayedOpt?.text}"</p>
                </div>
              </div>
              
              <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md mt-6">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">
                  {isLocked ? 'Your Submitted Choice' : 'Who wrote this response?'}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {['Human', 'Gemini'].map((author) => {
                    const isSelected = selectedAnswer === author;
                    return (
                      <button
                        key={author}
                        disabled={isLocked}
                        onClick={() => !isLocked && setSelectedAnswer(author)}
                        className={`py-4 px-4 rounded-xl border-2 text-lg font-bold transition-all duration-200 
                          ${isSelected ? 'border-primary-500 bg-primary-500/20 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]' 
                            : 'border-dark-600 bg-dark-800 text-slate-400 hover:border-dark-500 hover:bg-dark-700'}
                          ${isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <span>{author}</span>
                          {isSelected && isLocked && <Lock size={16} className="text-primary-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          );
        }

        // Clean, razor-sharp Question Card for MCQ, Image Challenges & Hallucinations
        return (
          <>
            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-400">
                {question.aiResponse ? 'Spot the Hallucination' : question.imageUrl ? 'Image Challenge' : 'Question'}
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-relaxed">
                {question.text}
              </h2>

              {question.aiResponse && (
                <div className="mt-4 p-5 rounded-xl border border-amber-500/40 bg-amber-950/20 shadow-inner">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 block mb-2">
                    AI Response to Evaluate:
                  </span>
                  <p className="text-slate-200 text-base md:text-lg italic leading-relaxed">
                    "{question.aiResponse}"
                  </p>
                </div>
              )}

              {question.imageUrl && (
                <div className="mt-4 flex justify-center bg-black/40 rounded-xl p-3 border border-white/10">
                  <img
                    src={question.imageUrl}
                    alt="Question visual"
                    className="rounded-lg max-h-72 object-contain shadow-lg"
                  />
                </div>
              )}
            </div>

            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md mt-6">
              <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">
                {isLocked ? 'Your Submitted Answer' : 'Select Your Answer'}
              </h3>
              {question.options?.length > 0 && (
                <div className="space-y-3">
                  {question.options.map((opt, idx) => {
                    const optKey = typeof opt === 'object' ? (opt.key || String.fromCharCode(65 + idx)) : (opt.length === 1 ? opt : String.fromCharCode(65 + idx));
                    const optText = typeof opt === 'object' ? (opt.answer || opt.label || opt.text || opt.key) : opt;
                    const isSelected = selectedAnswer === optKey || selectedAnswer === optText;

                    return (
                      <button
                        key={idx}
                        disabled={isLocked}
                        onClick={() => !isLocked && setSelectedAnswer(optKey)}
                        className={`relative overflow-hidden w-full text-left py-4 px-5 rounded-xl border-2 transition-all duration-200 shadow-md ${
                          isSelected
                            ? "bg-primary-500/20 border-primary-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.25)]"
                            : "border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-500 hover:bg-slate-800"
                        } ${isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
                      >
                        <div className="flex items-start space-x-3">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            isSelected ? 'bg-primary-500 text-black' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {optKey}
                          </span>
                          <span className="text-sm md:text-base font-medium leading-relaxed">
                            {optText}
                          </span>
                        </div>
                        {isSelected && isLocked && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Lock size={16} className="text-primary-400" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        );
      })()}

      {!evaluationData && !pollResult && question.type !== 'hallucination' && (
        <div className="poll-actions mt-2">
          {error && <p role="alert" className="poll-error text-center">{error}</p>}

          {!isLocked ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || (!selectedAnswer && !textAnswer.trim())}
              className="relative overflow-hidden font-['Cutepunch'] text-xl tracking-widest py-3 px-10 rounded-full bg-gradient-to-br from-sky-400 via-sky-500 to-sky-400 text-white shadow-[0_4px_20px_rgba(14,165,233,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_8px_28px_rgba(14,165,233,0.65),inset_0_1px_0_rgba(255,255,255,0.35)] active:translate-y-px active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 w-full mt-4"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Submit Answer</span>
                </>
              )}
            </button>
          ) : (
            <div className="mt-4 p-3 bg-dark-900/60 border border-dark-700 rounded-lg text-center text-xs text-slate-400 font-medium flex items-center justify-center space-x-2">
              <Lock size={14} className="text-primary-400" />
              <span>Submission locked for this round. Stay tuned for results.</span>
            </div>
          )}
        </div>
      )}

      {evaluationData && question.type === 'hallucination' && (
        <HallucinationCard question={question} evaluationData={evaluationData} />
      )}
    </div>
  );
}
