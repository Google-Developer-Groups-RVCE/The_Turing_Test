import React, { useContext, useEffect, useState } from 'react';
import { EventStateContext } from '../contexts/EventStateContext';
import { useSocket } from '../hooks/useSocket';
import {
  Eye,
  Sparkles,
  Trophy,
  CheckCircle,
} from 'lucide-react';

import { getActiveQuestion } from '../api/questionApi';
import { getSimulatedResponse, submitSimulatedResponse } from '../api/responseApi';
import { getLeaderboard } from '../api/leaderboardApi';

export default function ParticipantDeviceSimulation() {
  const socket = useSocket();
  const { currentRound, eventStatus, activeStage } =
    useContext(EventStateContext);

  const [activeQuestion, setActiveQuestion] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [simulatedAnswer, setSimulatedAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedAnswer, setSubmittedAnswer] = useState('');

  // ---------------------------------------------------------
  // FETCH ACTIVE QUESTION
  // ---------------------------------------------------------
  useEffect(() => {
    if (!currentRound?.id || eventStatus !== 'running') {
      setActiveQuestion(null);
      return;
    }

    getActiveQuestion(currentRound.id)
      .then((res) => {
        const q =
          res.data?.question ||
          (Array.isArray(res.data) ? res.data[0] : null);

        setActiveQuestion(q || null);
      })
      .catch((error) => {
        console.error('Failed to fetch active question:', error);
        setActiveQuestion(null);
      });
  }, [currentRound, eventStatus]);

  // A page refresh must not make a saved simulated response look as if it
  // disappeared.  Redis remains the source of truth for this preview.
  useEffect(() => {
    let cancelled = false;
    setSubmittedAnswer('');

    if (!currentRound?.id || !activeQuestion?.id || eventStatus !== 'running') {
      return undefined;
    }

    getSimulatedResponse(currentRound.id, activeQuestion.id)
      .then((res) => {
        if (!cancelled && res.data?.answer) {
          setSubmittedAnswer(res.data.answer);
        }
      })
      .catch((error) => {
        // The preview is an admin-only feature.  Preserve the submission UI
        // if its status check temporarily fails, and surface errors on submit.
        console.error('Failed to check simulated response:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [currentRound?.id, activeQuestion?.id, eventStatus]);

  // ---------------------------------------------------------
  // SOCKET EVENTS
  // ---------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleQuestion = (data) => {
      if (data?.question) {
        setActiveQuestion(data.question);
        setSimulatedAnswer('');
        setSubmitError('');
        setSubmittedAnswer('');
      }
    };

    const handleLeaderboard = (data) => {
      if (data?.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    };

    socket.on('question:changed', handleQuestion);
    socket.on('leaderboard:update', handleLeaderboard);

    return () => {
      socket.off('question:changed', handleQuestion);
      socket.off('leaderboard:update', handleLeaderboard);
    };
  }, [socket]);

  // ---------------------------------------------------------
  // FETCH LEADERBOARD
  // ---------------------------------------------------------
  useEffect(() => {
    if (activeStage !== 'leaderboard') return;

    getLeaderboard()
      .then((res) => {
        setLeaderboard(res.data?.leaderboard || []);
      })
      .catch((error) => {
        console.error('Failed to fetch leaderboard:', error);
        setLeaderboard([]);
      });
  }, [activeStage]);

  // ---------------------------------------------------------
  // LEADERBOARD VIEW
  // ---------------------------------------------------------
  function showLeaderboardView() {
    return activeStage === 'leaderboard';
  }

  // ---------------------------------------------------------
  // SUBMIT SIMULATED ANSWER
  // ---------------------------------------------------------
  async function handleSimulatedSubmit() {
    if (!currentRound?.id) {
      setSubmitError('No active round.');
      return;
    }

    if (!activeQuestion) {
      setSubmitError('No active question.');
      return;
    }

    if (!simulatedAnswer.trim()) {
      setSubmitError('Please enter an answer first.');
      return;
    }

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      console.log('Submitting simulated answer:', {
        roundId: currentRound.id,
        questionId: activeQuestion.id,
        answer: simulatedAnswer.trim(),
      });

      const response = await submitSimulatedResponse(
        currentRound.id,
        simulatedAnswer.trim()
      );

      console.log('Simulated answer submitted successfully:', response.data);

      setSubmittedAnswer(simulatedAnswer.trim());
      setSimulatedAnswer('');
    } catch (error) {
      console.error(
        'Failed to submit simulated answer:',
        error.response?.data || error
      );

      setSubmitError(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Failed to submit answer.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full h-[520px] rounded-3xl bg-dark-950 border-[6px] border-dark-700 shadow-2xl p-3 flex flex-col justify-between overflow-hidden relative font-sans text-xs">

      {/* Smartphone Header */}
      <div className="w-full flex items-center justify-between py-1 px-3 bg-dark-900/90 rounded-t-xl border-b border-white/10 shrink-0 text-[10px] font-mono text-slate-400">
        <span className="flex items-center space-x-1">
          <Eye size={12} className="text-primary-400" />
          <span className="text-slate-300 font-bold">
            Simulated Participant Device
          </span>
        </span>

        <span
          className={`px-1.5 py-0.5 rounded font-bold uppercase ${
            eventStatus === 'running'
              ? 'bg-primary-500/20 text-primary-400'
              : eventStatus === 'paused'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {eventStatus}
        </span>
      </div>

      {/* Screen */}
      <div className="flex-1 w-full bg-[#0d1b2a] text-white p-3 overflow-y-auto flex flex-col justify-between">

        {/* =====================================================
            LEADERBOARD
        ====================================================== */}
        {showLeaderboardView() ? (
          <div className="flex-1 flex flex-col items-center justify-start text-center space-y-3">

            <div className="p-3 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              <Trophy size={28} />
            </div>

            <h3 className="text-base font-bold text-white tracking-wide">
              Live Standings
            </h3>

            <div className="w-full space-y-1.5 overflow-y-auto max-h-[340px] pr-1">

              {leaderboard.length === 0 ? (
                <div className="text-slate-500 py-8 italic text-xs">
                  No standings recorded yet
                </div>
              ) : (
                leaderboard.slice(0, 5).map((entry, i) => (
                  <div
                    key={entry.username || i}
                    className="flex items-center justify-between p-2 rounded-lg bg-dark-800/80 border border-white/5 text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="font-mono text-slate-400 font-bold w-4">
                        #{i + 1}
                      </span>

                      <span className="font-semibold text-white truncate">
                        {entry.name || entry.username}
                      </span>
                    </div>

                    <span className="font-mono font-bold text-primary-400">
                      {entry.score} pts
                    </span>
                  </div>
                ))
              )}

            </div>
          </div>

        ) : eventStatus === 'running' && activeQuestion ? (

          /* =====================================================
             ACTIVE QUESTION
          ====================================================== */
          <div className="flex-1 flex flex-col justify-between space-y-3">

            <div className="space-y-2">

              <div className="flex items-center justify-between text-[10px] text-primary-400 font-mono uppercase tracking-wider">

                <span>
                  {currentRound?.name || 'Active Round'}
                </span>

                <span className="bg-primary-500/20 px-2 py-0.5 rounded text-primary-300">
                  Live Question
                </span>

              </div>

              <h4 className="text-sm font-bold text-white leading-snug">
                {activeQuestion.text || 'Question loaded'}
              </h4>

              {activeQuestion.imageUrl && (
                <img
                  src={activeQuestion.imageUrl}
                  alt="Question Visual"
                  className="w-full max-h-36 object-cover rounded-xl border border-white/10 my-1"
                />
              )}

            </div>

            {/* =================================================
                ANSWER AREA
            ================================================== */}
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[220px]">

              {activeQuestion.type === 'mcq' &&
              activeQuestion.options ? (

                Object.entries(activeQuestion.options).map(
                  ([key, val]) => {
                    // Seeded MCQs use an array of answer strings.  In that
                    // case the array index is only a display label; Redis
                    // must receive the answer text to match correctAnswer.
                    const optionValue = Array.isArray(activeQuestion.options)
                      ? String(val)
                      : key;
                    const optionLabel = Array.isArray(activeQuestion.options)
                      ? String.fromCharCode(65 + Number(key))
                      : key;

                    return (
                    <button
                      key={key}
                      onClick={() => {
                        setSimulatedAnswer(optionValue);
                        setSubmitError('');
                      }}
                      disabled={submitting || !!submittedAnswer}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        simulatedAnswer === optionValue
                          ? 'bg-primary-500/20 border-primary-400 text-white'
                          : 'bg-dark-800/60 border-white/10 text-slate-300 hover:bg-dark-800'
                      } ${
                        submitting || submittedAnswer
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      <span className="font-semibold text-xs">
                        {optionLabel}. {val}
                      </span>

                      {simulatedAnswer === optionValue && (
                        <CheckCircle
                          size={14}
                          className="text-primary-400 shrink-0 ml-1"
                        />
                      )}
                    </button>
                    );
                  }
                )

              ) : (

                <textarea
                  value={simulatedAnswer}
                  onChange={(e) => {
                    setSimulatedAnswer(e.target.value);
                    setSubmitError('');
                  }}
                  placeholder="Type simulated answer..."
                  disabled={submitting || !!submittedAnswer}
                  className="w-full p-2.5 rounded-xl bg-dark-900 border border-white/10 text-white text-xs h-24 focus:outline-none focus:border-primary-500 disabled:opacity-50"
                />

              )}

            </div>

            {/* ERROR MESSAGE */}
            {submitError && (
              <div className="text-red-400 text-[10px] text-center">
                {submitError}
              </div>
            )}

            {/* =================================================
                SUBMIT BUTTON
            ================================================== */}
            <button
              onClick={handleSimulatedSubmit}
              disabled={
                submitting ||
                !!submittedAnswer ||
                !simulatedAnswer.trim() ||
                !activeQuestion
              }
              className="w-full py-2 rounded-xl bg-primary-500 text-dark-950 font-bold text-xs shadow-lg hover:bg-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Submitting...'
                : submittedAnswer
                ? 'Simulated Answer Saved'
                : 'Submit Simulated Answer'}
            </button>

            {submittedAnswer && (
              <div className="text-primary-300 text-[10px] text-center">
                Saved in Redis for this question.
              </div>
            )}

          </div>

        ) : (

          /* =====================================================
             WAITING SCREEN
          ====================================================== */
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-6">

            <div className="p-4 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-400 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
              <Sparkles size={32} className="animate-pulse" />
            </div>

            <h3 className="text-base font-bold text-white tracking-wide">
              The Turing Test
            </h3>

            <p className="text-slate-400 text-[11px] leading-relaxed max-w-[220px]">
              Waiting for event controls. Screen will sync live as soon as
              admin launches a round.
            </p>

            <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Simulated Device Ready</span>
            </div>

          </div>
        )}

      </div>

      {/* Smartphone Bottom Bar */}
      <div className="w-full flex justify-center py-1 bg-dark-950 border-t border-white/5 shrink-0">
        <div className="w-24 h-1 rounded-full bg-slate-600/50" />
      </div>

    </div>
  );
}
