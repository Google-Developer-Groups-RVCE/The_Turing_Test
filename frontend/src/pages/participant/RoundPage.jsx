import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventStateContext } from '../../contexts/EventStateContext';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { getActiveQuestion } from '../../api/questionApi';
import { getMyResponse, submitResponse } from '../../api/responseApi';
import { getCurrentRound } from '../../api/roundApi';
import { SOCKET_EVENTS } from '../../utils/constants';
import { Clock, CheckCircle, XCircle, AlertCircle, Send, Pause, RefreshCw, Lock, Sparkles } from 'lucide-react';

import round1Data from '../../data/round1Data';
import round2Data from '../../data/round2Data';
import pollsData from '../../data/pollsData';
import round5Data from '../../data/round5Data';
import { submitR5Response, getMyR5Response, getR5Status, getR5Options, submitR5Vote, getMyR5Vote, getR5VotingStatus, getR5Results } from '../../api/r5Api';
import ChallengeCard from '../../components/ChallengeCard';
import PollCard from '../../components/PollCard';

const allRichData = [...round1Data, ...round2Data, ...pollsData];

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
    try {
      const rRes = await getCurrentRound().catch(() => null);
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
  }, [fetchQuestion, activeStage]);

  // Transition to Leaderboard if active stage is explicitly set to leaderboard
  useEffect(() => {
    const isSim = window.location.pathname.startsWith('/simulation');
    const basePath = isSim ? '/simulation' : '/participant';
    if (activeStage === 'leaderboard') {
      navigate(`${basePath}/leaderboard`, { replace: true });
    }
  }, [activeStage, navigate]);

  // Round 5 detection and socket listeners
  const isRound5 = question?.type === 'reverse-turing';

  useEffect(() => {
    if (!isRound5) return;
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
      try {
        const statusRes = await getR5Status();
        if (statusRes.data?.phase) setR5Phase(statusRes.data.phase);
      } catch {}
      try {
        const optRes = await getR5Options();
        if (optRes.data?.options) setR5Options(optRes.data.options);
      } catch {}
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
        setQuestion(data.question);
        setSelectedAnswer('');
        setTextAnswer('');
        setMyResponse(null);
        setEvaluationData(null);
        setPollResult(null);
        setError('');
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
    const handleQuestionEvaluate = (data) => {
      if (data?.evaluationData) {
        setEvaluationData(data.evaluationData);
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

    const handleStageChanged = (data) => {
      fetchQuestion();
    };

    socket.on(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
    socket.on('question:changed', handleQuestionChanged);
    socket.on('round:time_extended', handleTimeExtended);
    socket.on('poll:revealed', handlePollRevealed);
    socket.on('question:evaluate', handleQuestionEvaluate);
    socket.on('round:stage_changed', handleStageChanged);
    socket.on('responses:cleared', handleResponsesCleared);
    socket.on('round:ended', handleRoundEnded);

    return () => {
      if (roundEndTimer) clearTimeout(roundEndTimer);
      socket.off(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
      socket.off('question:changed', handleQuestionChanged);
      socket.off('round:time_extended', handleTimeExtended);
      socket.off('poll:revealed', handlePollRevealed);
      socket.off('question:evaluate', handleQuestionEvaluate);
      socket.off('round:stage_changed', handleStageChanged);
      socket.off('responses:cleared', handleResponsesCleared);
      socket.off('round:ended', handleRoundEnded);
    };
  }, [socket, fetchQuestion, setCurrentRound, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!currentRound?.durationSeconds || !currentRound?.startedAt) return;
    const startedAtMs = Number(currentRound.startedAt) || new Date(currentRound.startedAt).getTime();
    if (!startedAtMs || isNaN(startedAtMs)) return;
    const endTime = startedAtMs + currentRound.durationSeconds * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [currentRound]);

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

  const isLocked = !!myResponse || submitting;

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
    if (r5Phase === 'prompt') {
      return (
        <div className="flex-1 flex flex-col space-y-6 py-4 max-w-3xl mx-auto w-full animate-fade-in">
          <div className="w-full bg-gradient-to-br from-violet-900/30 via-dark-900/90 to-purple-950/30 border-2 border-violet-500/40 rounded-3xl p-8 shadow-[0_0_50px_rgba(139,92,246,0.25)] backdrop-blur-md">
            <div className="inline-flex items-center space-x-2 bg-violet-500/20 border border-violet-400/30 px-4 py-1.5 rounded-full mb-6">
              <span className="text-violet-300 text-xs font-extrabold uppercase tracking-widest">★ Round 5</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{round5Data[0].title}</h2>
            <h3 className="text-xl text-violet-300 font-medium italic mb-6">{round5Data[0].subtitle}</h3>
            <p className="text-slate-300 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5 mb-8">
              {round5Data[0].description}
            </p>
            <div className="p-6 rounded-2xl bg-violet-950/40 border border-violet-500/30 text-left">
              <span className="text-xs font-extrabold text-violet-400 block uppercase tracking-wider mb-2">Prompt:</span>
              <p className="text-white text-lg font-medium">"{round5Data[0].prompt}"</p>
            </div>
          </div>
          
          <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">
              {r5Submitted ? 'Your Submitted Response' : 'Write your response'}
            </h3>
            <textarea
              disabled={r5Submitted || r5Submitting}
              className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all min-h-[120px]"
              placeholder="Sound like an AI..."
              value={r5Response}
              onChange={(e) => setR5Response(e.target.value)}
              maxLength={500}
            />
            {!r5Submitted ? (
              <button
                onClick={handleR5Submit}
                disabled={r5Submitting || !r5Response.trim()}
                className="mt-4 w-full py-3 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold tracking-wide transition-all disabled:opacity-50"
              >
                {r5Submitting ? 'Submitting...' : 'Submit Response'}
              </button>
            ) : (
              <div className="mt-4 p-4 bg-violet-900/30 border border-violet-500/30 rounded-xl text-center flex items-center justify-center space-x-2">
                <CheckCircle size={18} className="text-violet-400" />
                <span className="text-violet-200 font-medium">Submitted! Waiting for others... ({r5Status?.totalSubmitted || 1}/{r5Status?.totalExpected || '?'})</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (r5Phase === 'voting') {
      return (
        <div className="flex-1 flex flex-col space-y-6 py-4 max-w-3xl mx-auto w-full animate-fade-in">
          <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-violet-400">Round 5 Voting</span>
              <h2 className="text-lg font-bold text-white mt-1">Which one is the real Gemini?</h2>
            </div>
            {r5Voted && <div className="px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-bold">Vote Locked</div>}
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {r5Options.map((opt) => {
              const isSelected = r5SelectedVote === opt.index;
              return (
                <button
                  key={opt.index}
                  disabled={r5Voted || r5Submitting}
                  onClick={() => setR5SelectedVote(opt.index)}
                  className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 shadow-md ${isSelected ? 'border-violet-500 bg-violet-900/30 shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'border-white/10 bg-black/40 hover:border-violet-500/50 hover:bg-black/60'} ${r5Voted ? 'cursor-not-allowed opacity-90' : ''}`}
                >
                  <p className={`text-lg leading-relaxed ${isSelected ? 'text-white' : 'text-slate-300'}`}>"{opt.text}"</p>
                  {isSelected && r5Voted && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Lock size={18} className="text-violet-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {!r5Voted ? (
            <button
              onClick={handleR5Vote}
              disabled={r5Submitting || r5SelectedVote === null}
              className="w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold tracking-wide transition-all disabled:opacity-50 shadow-lg text-lg"
            >
              {r5Submitting ? 'Casting Vote...' : 'Lock In Vote'}
            </button>
          ) : (
            <div className="w-full text-center p-4 text-violet-300 font-medium">
              Waiting for voting to conclude...
            </div>
          )}
        </div>
      );
    }

    if (r5Phase === 'results') {
      const geminiOption = r5Results?.find(r => r.author === '__gemini__');
      return (
        <div className="flex-1 flex flex-col py-8 px-4 w-full max-w-4xl mx-auto animate-fade-in">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400 mb-2 tracking-wide">
              Results Revealed
            </h2>
            <p className="text-slate-400 text-lg">Let's see who fooled who!</p>
          </div>

          <div className="w-full p-6 rounded-2xl bg-violet-900/20 border border-violet-500/40 mb-10 shadow-[0_0_40px_rgba(139,92,246,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-purple-500"></div>
            <h3 className="text-xs font-bold text-violet-300 uppercase tracking-widest mb-4">The Real Gemini Response</h3>
            <p className="text-2xl text-white font-medium italic leading-relaxed">"{geminiOption?.text}"</p>
            <div className="mt-4 flex items-center space-x-2">
              <span className="text-violet-200 font-bold bg-violet-500/20 px-3 py-1 rounded-lg">
                Identified correctly by {geminiOption?.percent || 0}% of players ({geminiOption?.votes || 0} Votes)
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Participant Responses</h3>
            {r5Results?.filter(r => r.author !== '__gemini__').sort((a,b) => b.votes - a.votes).map(res => (
              <div key={res.index} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-black/40 border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex-1 mb-4 md:mb-0 md:pr-6">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Author: <span className="text-sky-400">{res.author}</span></span>
                  <p className="text-slate-200 text-lg leading-relaxed">"{res.text}"</p>
                </div>
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t border-white/5 md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0 shrink-0">
                  <div className="text-3xl font-extrabold text-white">{res.percent}%</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">{res.votes} {res.votes === 1 ? 'Vote' : 'Votes'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  if (pollResult) {
    const getRichData = () => {
      if (!question) return null;
      const rName = (currentRound?.name || '').toLowerCase();
      const rId = String(currentRound?.id || '').toLowerCase();

      let dataset = [];
      if (rId.includes('r3') || rName.includes('round 3') || rName.includes('poll') || rName.includes('speedrun') || rName.includes('decode')) {
        dataset = pollsData;
      } else if (rId.includes('r2') || rName.includes('round 2') || rName.includes('coding') || rName.includes('image')) {
        dataset = round2Data;
      } else if (rId.includes('r1') || rName.includes('round 1') || rName.includes('conversation') || rName.includes('aptitude')) {
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
            {question.type === 'mcq' ? 'Multiple Choice Question' : question.type === 'poll' ? 'Live Poll' : question.type === 'guess-author' ? 'Guess the Author' : 'Short Answer Question'}
          </h2>
        </div>
        {timeLeft !== null && (
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-mono text-lg font-bold border
            ${timeLeft < 30 ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-glass-border bg-glass-bg text-primary-300'}
          `}>
            <Clock size={18} className={timeLeft < 30 ? 'text-rose-400 animate-pulse' : 'text-primary-400'} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}
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

      {/* Evaluation View */}
      {evaluationData && (
        <div className="w-full bg-dark-900/80 border border-white/10 rounded-xl p-8 shadow-2xl backdrop-blur-md flex flex-col items-center text-center">
          {(() => {
            const isCorrect = myResponse && String(myResponse.answer).toLowerCase() === String(evaluationData.correctAnswer).toLowerCase();
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
                
                <h2 className={`font-['Cutepunch'] text-4xl tracking-widest mb-2 ${isCorrect ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </h2>
                
                <div className="w-full mt-6 space-y-4 text-left">
                  <div className="p-4 rounded-xl bg-dark-800 border border-dark-600">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Your Answer</p>
                    <p className={`text-lg font-medium ${isCorrect ? 'text-emerald-300' : 'text-rose-400'}`}>
                      {myResponse?.answer || 'No answer submitted'}
                    </p>
                  </div>
                  {!isCorrect && (
                    <div className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/30">
                      <p className="text-xs text-emerald-500/80 font-bold uppercase tracking-wider mb-1">Correct Answer</p>
                      <p className="text-lg font-medium text-emerald-400">
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
          <h2 className="font-['Borghan'] text-3xl md:text-4xl font-bold text-white mb-2 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Community Choice</h2>
          
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
        if (question.type === 'profile-guess' || question.id === 'poll6') {
          const handleProfileChange = (field, val) => {
            const next = { ...profileGuess, [field]: val };
            setProfileGuess(next);
            const str = `Age: ${next.age} | Profession: ${next.profession} | Hobby: ${next.hobby}`;
            setSelectedAnswer(str);
            setTextAnswer(str);
          };

          return (
            <div className="w-full bg-white/5 border border-white/10 rounded-xl p-8 shadow-2xl backdrop-blur-md space-y-6">
              <h2 className="font-['Borghan'] text-2xl md:text-4xl font-bold text-white tracking-wide">{question.text || "Round 3 — Decode the Hidden Profile"}</h2>
              <p className="text-sm text-slate-400 italic">Based on the clues revealed across Polls 1–5, submit your final guess for Gemini's hidden profile:</p>

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
          );
        }

        if (question.type === 'guess-author') {
          const displayedOpt = question.options?.find(o => o.id === question.displayedOptionId) || question.options?.[0];
          return (
            <>
              <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md">
                <h2 className="font-['Borghan'] text-2xl md:text-3xl font-bold text-white tracking-wide mb-4">{question.text}</h2>
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

        const getRichData = () => {
          if (!question) return null;
          const rName = (currentRound?.name || '').toLowerCase();
          const rId = String(currentRound?.id || '').toLowerCase();

          let dataset = [];
          if (rId.includes('r3') || rName.includes('round 3') || rName.includes('poll') || rName.includes('speedrun') || rName.includes('decode')) {
            dataset = pollsData;
          } else if (rId.includes('r2') || rName.includes('round 2') || rName.includes('coding') || rName.includes('image')) {
            dataset = round2Data;
          } else if (rId.includes('r1') || rName.includes('round 1') || rName.includes('conversation') || rName.includes('aptitude')) {
            dataset = round1Data;
          } else {
            dataset = allRichData;
          }

          return dataset.find((d) => d.id === question.id || (d.order && Number(d.order) === Number(question.order))) ||
                 allRichData.find((d) => d.id === question.id);
        };

        const richData = getRichData();
        
        if (richData) {
          if (question.type === 'poll' || (richData.options && richData.options[0]?.question)) {
            return (
              <div className="poll-screen" style={{ width: '100%' }}>
                <PollCard
                  poll={richData}
                  selectedOption={selectedAnswer}
                  onSelect={(key) => !isLocked && setSelectedAnswer(key)}
                  pollResult={pollResult}
                />
              </div>
            );
          } else {
            return (
              <div className="poll-screen" style={{ width: '100%' }}>
                <ChallengeCard
                  challenge={richData}
                  selectedOption={selectedAnswer}
                  textValue={textAnswer}
                  onSelect={(key) => !isLocked && setSelectedAnswer(key)}
                  onTextChange={(val) => !isLocked && setTextAnswer(val)}
                />
              </div>
            );
          }
        }

        // Fallback for non-rich questions (if any)
        return (
          <>
            <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md">
              <h2 className="font-['Borghan'] text-2xl md:text-3xl font-bold text-white tracking-wide mb-4">{question.text}</h2>
              {question.imageUrl && (
                <img
                  src={question.imageUrl}
                  alt="Question visual"
                  className="mt-4 rounded-xl max-h-56 object-contain border border-glass-border"
                />
              )}
            </div>

            <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md mt-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">
                {isLocked ? 'Your Submitted Choice' : 'Select Your Answer'}
              </h3>
              {(question.type === 'mcq' || question.type === 'poll') && question.options?.length > 0 ? (
                <div className="options-list">
                  {question.options.map((opt, idx) => {
                    const isPoll = question.type === 'poll';
                    const optValue = isPoll ? opt.key : opt;
                    const optDisplay = isPoll ? opt.question : opt;
                    const isSelected = selectedAnswer === optValue;

                    return (
                      <button
                        key={idx}
                        disabled={isLocked}
                        onClick={() => !isLocked && setSelectedAnswer(optValue)}
                        className={`relative overflow-hidden w-full text-left py-4 px-6 rounded-2xl border-2 transition-all duration-300 shadow-lg ${isSelected ? "bg-gradient-to-br from-teal-400/35 to-teal-600/45 border-teal-400 shadow-[0_4px_24px_rgba(0,201,177,0.5),inset_0_1px_0_rgba(255,255,255,0.25)]" : "border-sky-400/40 bg-gradient-to-br from-sky-400/15 to-blue-600/20 text-white hover:translate-x-1 hover:border-sky-400/80 hover:shadow-[0_4px_20px_rgba(91,200,245,0.35)]"} ${isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
                      >
                        <div className="flex items-center">
                          <span className={`font-['Cutepunch'] text-lg mr-2 shrink-0 transition-colors ${isSelected ? "text-teal-200" : "text-sky-300"}`}>
                            {isPoll ? opt.key : String.fromCharCode(65 + idx)}.
                          </span>
                          <span className="text-base text-slate-200 leading-relaxed">{optDisplay}</span>
                        </div>
                        {isSelected && isLocked && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Lock size={16} className="text-teal-400 opacity-80" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  disabled={isLocked}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                  placeholder="Type your answer here..."
                  value={textAnswer}
                  onChange={(e) => !isLocked && setTextAnswer(e.target.value)}
                  maxLength={500}
                />
              )}
            </div>
          </>
        );
      })()}

      {!evaluationData && !pollResult && (
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
    </div>
  );
}
