import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventStateContext } from '../../contexts/EventStateContext';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { getActiveQuestion } from '../../api/questionApi';
import { getMyResponse, submitResponse } from '../../api/responseApi';
import { SOCKET_EVENTS } from '../../utils/constants';
import { Clock, CheckCircle, XCircle, AlertCircle, Send, Pause } from 'lucide-react';

export default function RoundPage() {
  const { currentRound, eventStatus } = useContext(EventStateContext);
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

  const fetchQuestion = useCallback(async () => {
    if (!currentRound) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [qRes, rRes] = await Promise.allSettled([
        getActiveQuestion(currentRound.id),
        getMyResponse(currentRound.id),
      ]);
      if (qRes.status === 'fulfilled') {
        const qData = qRes.value.data;
        const q = qData?.question || (Array.isArray(qData) ? qData[0] : (qData?.id ? qData : null));
        setQuestion(q || null);
      }
      if (rRes.status === 'fulfilled') setMyResponse(rRes.value.data?.response || null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [currentRound]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  // Auto-navigate on state changes — if no round active and idle, go to waiting screen
  useEffect(() => {
    if (!currentRound && eventStatus !== 'paused') {
      navigate('/participant', { replace: true });
    }
    if (eventStatus === 'ended') {
      navigate('/participant/leaderboard', { replace: true });
    }
  }, [currentRound, eventStatus, navigate]);

  // Socket: round changed — refetch question
  useEffect(() => {
    if (!socket) return;
    const handleRoundChanged = () => fetchQuestion();
    socket.on(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
    return () => socket.off(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
  }, [socket, fetchQuestion]);

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
    const answer = question?.type === 'mcq' ? selectedAnswer : textAnswer;
    if (!answer.trim()) {
      setError('Please provide an answer before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await submitResponse(currentRound.id, answer.trim());
      setMyResponse(res.data.response);
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
        <p className="text-slate-500 text-sm">The admin hasn't set a question for this round yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-6 py-4">
      {/* Round Header */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary-400">
              {currentRound?.name || 'Current Round'}
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              {question.type === 'mcq' ? 'Multiple Choice Question' : 'Short Answer Question'}
            </h2>
          </div>
          {timeLeft !== null && (
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-mono text-lg font-bold border
              ${timeLeft < 30 ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-primary-500/30 bg-primary-500/10 text-primary-300'}
            `}>
              <Clock size={18} className={timeLeft < 30 ? 'text-rose-400 animate-pulse' : 'text-primary-400'} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Already Answered State */}
      {myResponse ? (
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            {myResponse.isCorrect
              ? <CheckCircle size={28} className="text-primary-400" />
              : <XCircle size={28} className="text-rose-400" />}
            <div>
              <h3 className="text-lg font-bold text-white">
                {myResponse.isCorrect ? 'Correct!' : 'Incorrect'}
              </h3>
              <p className="text-sm text-slate-400">
                {myResponse.isCorrect
                  ? `You earned ${myResponse.pointsAwarded} points!`
                  : `Better luck next time. You earned 0 points.`}
              </p>
            </div>
          </div>
          <div className="bg-dark-900/50 rounded-lg p-4">
            <p className="text-xs text-slate-500 mb-1">Your Answer</p>
            <p className="text-white font-medium">{myResponse.answer}</p>
          </div>
          <p className="text-xs text-slate-600 mt-3">
            Submitted at {new Date(myResponse.submittedAt).toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <>
          {/* Question Card */}
          <div className="card">
            <p className="text-lg text-white leading-relaxed font-medium">
              {question.text}
            </p>
            {question.imageUrl && (
              <img
                src={question.imageUrl}
                alt="Question visual"
                className="mt-4 rounded-lg max-h-48 object-contain border border-dark-700"
              />
            )}
            <div className="mt-3 flex items-center space-x-3 text-sm text-slate-500">
              <span className="px-2 py-0.5 bg-primary-900/40 text-primary-400 rounded text-xs font-medium capitalize">
                {question.type === 'mcq' ? 'MCQ' : 'Short Answer'}
              </span>
              <span>{question.points} point{question.points !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Answer Section */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Your Answer</h3>

            {question.type === 'mcq' && question.options?.length > 0 ? (
              <div className="space-y-3">
                {question.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedAnswer(opt)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all font-medium
                      ${selectedAnswer === opt
                        ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                        : 'border-dark-700 bg-dark-900/40 text-slate-300 hover:border-dark-600 hover:bg-dark-800/60'
                      }`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mr-3 font-bold
                      ${selectedAnswer === opt ? 'bg-primary-500 text-white' : 'bg-dark-700 text-slate-400'}`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                className="input-field min-h-[120px] resize-none"
                placeholder="Type your answer here..."
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                maxLength={500}
              />
            )}

            {error && (
              <div className="mt-3 bg-rose-900/40 border border-rose-500/40 text-rose-300 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || (!selectedAnswer && !textAnswer.trim())}
              className="btn-primary w-full mt-4 flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Answer</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
