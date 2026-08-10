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
  const [profileGuess, setProfileGuess] = useState({ age: '', profession: '', hobby: '' });
  const [myResponse, setMyResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [pollResult, setPollResult] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);

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

      const qRes = await getActiveQuestion(roundId).catch(() => null);
      let q = null;
      if (qRes?.data) {
        const qData = qRes.data;
        q = qData?.question || (Array.isArray(qData) ? qData[0] : (qData?.id ? qData : null));
        setQuestion(q || null);
      } else {
        setQuestion(null);
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
        setEvaluationData(null);
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
    const handleQuestionEvaluate = (data) => {
      if (data?.evaluationData) {
        setEvaluationData(data.evaluationData);
      }
    };

    socket.on(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
    socket.on('question:changed', handleQuestionChanged);
    socket.on('round:time_extended', handleTimeExtended);
    socket.on('poll:revealed', handlePollRevealed);
    socket.on('question:evaluate', handleQuestionEvaluate);

    return () => {
      socket.off(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
      socket.off('question:changed', handleQuestionChanged);
      socket.off('round:time_extended', handleTimeExtended);
      socket.off('poll:revealed', handlePollRevealed);
      socket.off('question:evaluate', handleQuestionEvaluate);
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

      {/* Question Card & Answer Section */}
      {!evaluationData && (() => {
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

        const richData = allRichData.find((d) => d.id === question.id || (d.order && Number(d.order) === Number(question.order)));
        
        if (richData) {
          if (question.type === 'poll') {
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

      {!evaluationData && (
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
      )}
    </div>
  );
}
