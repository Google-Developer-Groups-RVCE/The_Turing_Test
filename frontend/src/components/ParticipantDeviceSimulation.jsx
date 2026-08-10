import React, { useContext, useEffect, useState } from 'react';
import { EventStateContext } from '../contexts/EventStateContext';
import { useSocket } from '../hooks/useSocket';
import { Clock, Eye, Sparkles, Trophy, Users, CheckCircle, HelpCircle } from 'lucide-react';
import { getActiveQuestion } from '../api/questionApi';
import { getLeaderboard } from '../api/leaderboardApi';

export default function ParticipantDeviceSimulation() {
  const socket = useSocket();
  const { currentRound, eventStatus, activeStage } = useContext(EventStateContext);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [simulatedAnswer, setSimulatedAnswer] = useState('');

  // Fetch active question on round change or socket event
  useEffect(() => {
    if (!currentRound?.id || eventStatus !== 'running') {
      setActiveQuestion(null);
      return;
    }
    getActiveQuestion(currentRound.id)
      .then((res) => {
        const q = res.data?.question || (Array.isArray(res.data) ? res.data[0] : null);
        setActiveQuestion(q || null);
      })
      .catch(() => setActiveQuestion(null));
  }, [currentRound, eventStatus]);

  // Listen to socket question change
  useEffect(() => {
    if (!socket) return;
    const handleQuestion = (data) => {
      if (data?.question) setActiveQuestion(data.question);
    };
    const handleLeaderboard = (data) => {
      if (data?.leaderboard) setLeaderboard(data.leaderboard);
    };
    socket.on('question:changed', handleQuestion);
    socket.on('leaderboard:update', handleLeaderboard);
    return () => {
      socket.off('question:changed', handleQuestion);
      socket.off('leaderboard:update', handleLeaderboard);
    };
  }, [socket]);

  // Fetch leaderboard when activeStage is leaderboard
  useEffect(() => {
    if (activeStage === 'leaderboard' || showLeaderboardView()) {
      getLeaderboard()
        .then((res) => setLeaderboard(res.data?.leaderboard || []))
        .catch(() => setLeaderboard([]));
    }
  }, [activeStage]);

  function showLeaderboardView() {
    return activeStage === 'leaderboard';
  }

  return (
    <div className="w-full h-[520px] rounded-3xl bg-dark-950 border-[6px] border-dark-700 shadow-2xl p-3 flex flex-col justify-between overflow-hidden relative font-sans text-xs">
      {/* Smartphone Notch & Status Bar Header */}
      <div className="w-full flex items-center justify-between py-1 px-3 bg-dark-900/90 rounded-t-xl border-b border-white/10 shrink-0 text-[10px] font-mono text-slate-400">
        <span className="flex items-center space-x-1">
          <Eye size={12} className="text-primary-400" />
          <span className="text-slate-300 font-bold">Simulated Participant Device</span>
        </span>
        <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
          eventStatus === 'running' ? 'bg-primary-500/20 text-primary-400' :
          eventStatus === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-slate-800 text-slate-400'
        }`}>
          {eventStatus}
        </span>
      </div>

      {/* Screen Content Container */}
      <div className="flex-1 w-full bg-[#0d1b2a] text-white p-3 overflow-y-auto flex flex-col justify-between">

        {/* 1. LEADERBOARD VIEW */}
        {showLeaderboardView() ? (
          <div className="flex-1 flex flex-col items-center justify-start text-center space-y-3">
            <div className="p-3 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              <Trophy size={28} />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide">Live Standings</h3>
            <div className="w-full space-y-1.5 overflow-y-auto max-h-[340px] pr-1">
              {leaderboard.length === 0 ? (
                <div className="text-slate-500 py-8 italic text-xs">No standings recorded yet</div>
              ) : (
                leaderboard.slice(0, 5).map((entry, i) => (
                  <div key={entry.username || i} className="flex items-center justify-between p-2 rounded-lg bg-dark-800/80 border border-white/5 text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="font-mono text-slate-400 font-bold w-4">#{i + 1}</span>
                      <span className="font-semibold text-white truncate">{entry.name || entry.username}</span>
                    </div>
                    <span className="font-mono font-bold text-primary-400">{entry.score} pts</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : eventStatus === 'running' && activeQuestion ? (

          /* 2. ACTIVE QUESTION VIEW */
          <div className="flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-primary-400 font-mono uppercase tracking-wider">
                <span>{currentRound?.name || 'Active Round'}</span>
                <span className="bg-primary-500/20 px-2 py-0.5 rounded text-primary-300">Live Question</span>
              </div>
              <h4 className="text-sm font-bold text-white leading-snug">
                {activeQuestion.text || 'Question loaded'}
              </h4>
            </div>

            {/* Options list */}
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[220px]">
              {activeQuestion.type === 'mcq' && activeQuestion.options ? (
                Object.entries(activeQuestion.options).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setSimulatedAnswer(key)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                      simulatedAnswer === key ? 'bg-primary-500/20 border-primary-400 text-white' : 'bg-dark-800/60 border-white/10 text-slate-300 hover:bg-dark-800'
                    }`}
                  >
                    <span className="font-semibold text-xs">{key}. {val}</span>
                    {simulatedAnswer === key && <CheckCircle size={14} className="text-primary-400 shrink-0 ml-1" />}
                  </button>
                ))
              ) : (
                <textarea
                  value={simulatedAnswer}
                  onChange={(e) => setSimulatedAnswer(e.target.value)}
                  placeholder="Type simulated answer..."
                  className="w-full p-2.5 rounded-xl bg-dark-900 border border-white/10 text-white text-xs h-24 focus:outline-none focus:border-primary-500"
                />
              )}
            </div>

            <button
              onClick={() => setSimulatedAnswer('')}
              className="w-full py-2 rounded-xl bg-primary-500 text-dark-950 font-bold text-xs shadow-lg hover:bg-primary-400 transition-colors"
            >
              Submit Simulated Answer
            </button>
          </div>
        ) : (

          /* 3. WAITING SCREEN VIEW */
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-6">
            <div className="p-4 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-400 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
              <Sparkles size={32} className="animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide">The Turing Test</h3>
            <p className="text-slate-400 text-[11px] leading-relaxed max-w-[220px]">
              Waiting for event controls. Screen will sync live as soon as admin launches a round.
            </p>
            <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Simulated Device Ready</span>
            </div>
          </div>
        )}
      </div>

      {/* Smartphone Bottom Home Bar Indicator */}
      <div className="w-full flex justify-center py-1 bg-dark-950 border-t border-white/5 shrink-0">
        <div className="w-24 h-1 rounded-full bg-slate-600/50" />
      </div>
    </div>
  );
}
