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
  const [myResponse, setMyResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [pollResult, setPollResult] = useState(null);

  const fetchQuestion = useCallback(async () => {
    setLoading(true);
    try {
      let roundToUse = currentRound;
      if (!roundToUse) {
        const rRes = await getCurrentRound();
        roundToUse = rRes.data?.round || (rRes.data?.id ? rRes.data : null);
        if (roundToUse) {
          setCurrentRound(roundToUse);
          setEventStatus(roundToUse.status === 'active' ? 'running' : roundToUse.status === 'paused' ? 'paused' : 'idle');
        }
      }

      const roundId = typeof roundToUse === 'string' ? roundToUse : roundToUse?.id;
      if (!roundId) {
        setQuestion(null);
        setLoading(false);
        return;
      }

      const [qRes, respRes] = await Promise.allSettled([
        getActiveQuestion(roundId),
        getMyResponse(roundId),
      ]);

      if (qRes.status === 'fulfilled') {
        const qData = qRes.value.data;
        const q = qData?.question || (Array.isArray(qData) ? qData[0] : (qData?.id ? qData : null));
        setQuestion(q || null);
      } else {
        setQuestion(null);
      }

      if (respRes.status === 'fulfilled') {
        const resp = respRes.value.data?.response || (respRes.value.data?.answer ? respRes.value.data : null);
        setMyResponse(resp || null);
        if (resp?.answer) {
          setSelectedAnswer(resp.answer);
          setTextAnswer(resp.answer);
        }
      }
    } catch {
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  }, [currentRound, setCurrentRound, setEventStatus]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  // Transition to Leaderboard if active stage is leaderboard or round ended
  useEffect(() => {
    if (activeStage === 'leaderboard' || eventStatus === 'ended') {
      navigate('/participant/leaderboard', { replace: true });
    }
  }, [activeStage, eventStatus, navigate]);

  // Socket: round changed & question changed — update question live
  useEffect(() => {
    if (!socket) return;
    const handleRoundChanged = () => fetchQuestion();
    const handleQuestionChanged = (data) => {
      if (data?.question) {
        setQuestion(data.question);
        setSelectedAnswer('');
        setTextAnswer('');
        setMyResponse(null);
        setError('');
      } else {
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

    socket.on(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
    socket.on('question:changed', handleQuestionChanged);
    socket.on('round:time_extended', handleTimeExtended);
    socket.on('poll:revealed', handlePollRevealed);

    return () => {
      socket.off(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
      socket.off('question:changed', handleQuestionChanged);
      socket.off('round:time_extended', handleTimeExtended);
      socket.off('poll:revealed', handlePollRevealed);
    };
  }, [socket, fetchQuestion, setCurrentRound]);

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
    const answer = question?.type === 'mcq' ? selectedAnswer : textAnswer;
    if (!answer.trim()) {
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

  if (!question) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
        <AlertCircle size={48} className="text-slate-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-300 mb-2">No Question Available</h2>
        <p className="text-slate-500 text-sm mb-6">The admin hasn't set a question for this round yet or event is idle.</p>
        <button
          onClick={fetchQuestion}
          className="btn-primary px-4 py-2 text-sm flex items-center space-x-2"
        >
          <RefreshCw size={16} />
          <span>Refresh Question</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-6 py-4 max-w-3xl mx-auto w-full">
      {/* Round Header */}
      <div className="poll-card p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary-400">
            {currentRound?.name || 'Current Round'}
          </span>
          <h2 className="text-lg font-bold text-white mt-0.5">
            {question.type === 'mcq' ? 'Multiple Choice Question' : question.type === 'poll' ? 'Live Poll' : 'Short Answer Question'}
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
      {myResponse && (
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

      {/* Question Card & Answer Section */}
      {(() => {
        const richData = allRichData.find((d) => d.id === question.id);
        
        if (richData) {
          if (question.type === 'poll') {
            return (
              <div className="poll-screen" style={{ width: '100%' }}>
                <PollCard
                  poll={richData}
                  selectedOption={selectedAnswer}
                  onSelect={(key) => !isLocked && setSelectedAnswer(key)}
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
            <div className="poll-card">
              <h2 className="poll-title text-3xl mb-4">{question.text}</h2>
              {question.imageUrl && (
                <img
                  src={question.imageUrl}
                  alt="Question visual"
                  className="mt-4 rounded-xl max-h-56 object-contain border border-glass-border"
                />
              )}
            </div>

            <div className="poll-card mt-6">
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
                        className={`option-btn ${isSelected ? 'selected' : ''} ${isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
                      >
                        <div className="flex items-center">
                          <span className="option-key shrink-0">
                            {isPoll ? opt.key : String.fromCharCode(65 + idx)}.
                          </span>
                          <span className="option-answer">{optDisplay}</span>
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
                  className="challenge-textarea"
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

      <div className="poll-actions mt-2">
        {error && <p role="alert" className="poll-error text-center">{error}</p>}

        {!isLocked ? (
          <button
            onClick={handleSubmit}
            disabled={submitting || (!selectedAnswer && !textAnswer.trim())}
            className="btn-glossy flex items-center justify-center space-x-2 w-full mt-4"
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

        {pollResult && (
          <div className="mt-6 p-5 rounded-xl border border-purple-500/40 bg-purple-900/20 text-purple-100 backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <h4 className="text-sm font-bold uppercase tracking-wider text-purple-400 mb-2 flex items-center space-x-2">
              <Sparkles size={16} />
              <span>Poll Results are in!</span>
            </h4>
            <div className="text-lg font-medium leading-relaxed">
              {pollResult.answerText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
